<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendFirebasePushNotification;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Support\SubscriptionPeriod;
use App\Services\AdminStatsCache;
use App\Services\UserNotificationService;
use App\Services\SecurityAuditService;
use Throwable;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    public function __construct(protected SecurityAuditService $securityAudit)
    {
    }

    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public function summary()
    {
        $payload = AdminStatsCache::rememberSummary(function () {
            $todayStart = now()->startOfDay();
            $todayEnd = now()->endOfDay();
            $expiringSoonDays = SubscriptionPeriod::expiringSoonDays();
            $expiringSoonEnd = now()->copy()->addDays($expiringSoonDays)->endOfDay();

            $pendingProvidersCount = ProviderProfile::query()
                ->whereHas('latestApplication', function ($query) {
                    $query->where('application_status', 'pending');
                })
                ->count();

            $expiredTodayCount = ProviderProfile::query()
                ->whereBetween('subscription_ends_at', [$todayStart, $todayEnd])
                ->count();

            $expiringSoonCount = ProviderProfile::query()
                ->where('subscription_ends_at', '>', $todayEnd)
                ->where('subscription_ends_at', '<=', $expiringSoonEnd)
                ->count();

            return [
                'pending_providers_count' => $pendingProvidersCount,
                'expired_today_count' => $expiredTodayCount,
                'expiring_soon_count' => $expiringSoonCount,
                'messages' => [
                    'new_provider' => 'يوجد مزود جديد بانتظار المراجعة',
                    'expired_today' => "انتهى اشتراك {$expiredTodayCount} مزودين اليوم",
                    'expiring_soon' => "يوجد {$expiringSoonCount} اشتراكات ستنتهي خلال {$expiringSoonDays} أيام",
                ],
            ];
        });

        return $this->json($payload);
    }

    public function broadcast(Request $request, UserNotificationService $notifications)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:1000'],
            'title' => ['nullable', 'string', 'max:255'],
            'target' => ['nullable', 'in:all,providers,admins'],
        ]);

        $title = $data['title'] ?: 'رسالة من الإدارة';
        $message = $data['message'];
        $target = $data['target'] ?? 'all';
        $this->securityAudit->record($request, 'notification.broadcast_started', 'success', ['target' => $target]);

        $usersQuery = User::query()
            ->whereIn('role', $target === 'all' ? ['provider', 'admin'] : [$target === 'providers' ? 'provider' : 'admin'])
            ->where('status', 'active');

        $queuedRecipients = 0;

        try {
            $usersQuery->with('deviceTokens')->chunkById(200, function ($users) use (
                $notifications, $title, $message, &$queuedRecipients
            ) {
                $notifications->createForUsers($users, 'general', $message, $title);

                $recipientIds = $users
                    ->filter(fn (User $user) => $user->deviceTokens->isNotEmpty())
                    ->pluck('id')
                    ->map(fn ($id) => (string) $id)
                    ->values()
                    ->all();

                if ($recipientIds === []) {
                    return;
                }

                SendFirebasePushNotification::dispatch(
                    $recipientIds,
                    $title,
                    $message,
                    ['type' => 'general', 'title' => $title, 'body' => $message]
                );

                $queuedRecipients += count($recipientIds);
            }, 'id');
        } catch (Throwable $e) {
            report($e);

            return $this->json([
                'message' => 'فشل إرسال الإشعار. تحقق من إعدادات Firebase أو SSL على السيرفر.',
                'details' => app()->environment('local') ? $e->getMessage() : null,
            ], 500);
        }

        return $this->json([
            'message' => 'تم إرسال الإشعار الجماعي بنجاح',
            'result' => [
                'sent' => $queuedRecipients,
                'failed' => 0,
            ],
        ]);
    }
}
