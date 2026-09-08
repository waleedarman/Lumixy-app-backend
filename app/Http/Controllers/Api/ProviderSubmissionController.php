<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendFirebasePushNotification;
use App\Models\ProviderApplication;
use App\Models\User;
use App\Services\AdminStatsCache;
use App\Services\ProviderVisibilityService;
use App\Services\SecurityAuditService;
use App\Services\UserNotificationService;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProviderSubmissionController extends Controller
{
    public function __construct(
        protected SecurityAuditService $securityAudit,
    ) {}

    public function submit(
        Request $request,
        UserNotificationService $notifications,
        ProviderVisibilityService $visibility,
    ) {
        $profile = $request->user()
            ->providerProfile()
            ->with(['gallery', 'applications', 'category', 'city', 'subServices'])
            ->first();

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        if (
            ! $profile->provider_name ||
            ! $profile->city_id ||
            ! $profile->whatsapp_number ||
            ! $profile->category_id
        ) {
            return response()->json([
                'message' => 'Profile is incomplete',
            ], 422);
        }

        // Always reload pivot in case an earlier write committed after this request started.
        $profile->load('subServices');

        if ($profile->subServices->isEmpty()) {
            return response()->json([
                'message' => 'Add at least one service',
            ], 422);
        }

        $latestApplication = $profile->applications()
            ->latest('submitted_at')
            ->first();

        // If provider is already approved and active, treat this as direct profile update.
        if (
            $latestApplication &&
            $latestApplication->application_status === 'approved' &&
            $request->user()->status === 'active'
        ) {
            $profile->forceFill([
                'is_profile_completed' => true,
            ])->save();
            PublicApiCache::flushProviders();
            AdminStatsCache::flush();
            $visibility->sync($profile->fresh(['user', 'latestApplication']) ?? $profile, flushPublicCache: false);
            PublicApiCache::flushProviders();

            return response()->json([
                'message' => 'Profile updated successfully',
            ]);
        }

        if ($latestApplication && $latestApplication->application_status === 'pending') {
            // Still notify admins if somehow the in-app rows were never created.
            $this->notifyAdminsOfPendingProvider($request, $notifications, $profile->provider_name);

            return response()->json([
                'message' => 'You already have a pending application.',
                'application_status' => 'pending',
            ], 422);
        }

        DB::transaction(function () use ($profile) {
            $profile->forceFill([
                'is_profile_completed' => true,
            ])->save();

            ProviderApplication::create([
                'provider_profile_id' => $profile->id,
                'application_status' => 'pending',
                'submitted_at' => now(),
            ]);
        });

        $visibility->sync($profile->fresh(['user', 'latestApplication']) ?? $profile, flushPublicCache: false);
        PublicApiCache::flushProviders();
        AdminStatsCache::flush();

        $this->notifyAdminsOfPendingProvider($request, $notifications, $profile->provider_name);

        $this->securityAudit->record($request, 'provider.application_submitted', 'success', [
            'provider_profile_id' => $profile->id,
            'provider_name' => $profile->provider_name,
        ]);

        return response()->json([
            'message' => 'Application submitted successfully',
            'application_status' => 'pending',
        ]);
    }

    public function status(Request $request)
    {
        $profile = $request->user()
            ->providerProfile()
            ->with(['applications' => fn ($q) => $q->latest('submitted_at')])
            ->first();

        if (! $profile) {
            return response()->json([
                'message' => 'Provider profile not found.',
            ], 404);
        }

        $latest = $profile->applications->first();

        return response()->json([
            'application_status' => $latest?->application_status,
            'submitted_at' => $latest?->submitted_at,
            'notes' => $latest?->notes,
            'is_profile_completed' => $profile->is_profile_completed,
            'can_submit' => $this->profileReadyForSubmit($profile),
        ]);
    }

    protected function profileReadyForSubmit($profile): bool
    {
        $profile->loadMissing('subServices');

        return (bool) (
            $profile->provider_name
            && $profile->city_id
            && $profile->whatsapp_number
            && $profile->category_id
            && $profile->subServices->isNotEmpty()
        );
    }

    protected function notifyAdminsOfPendingProvider(
        Request $request,
        UserNotificationService $notifications,
        ?string $providerName,
    ): void {
        try {
            $allActiveAdmins = User::query()
                ->with('deviceTokens')
                ->where('role', 'admin')
                ->where('status', 'active')
                ->get();

            if ($allActiveAdmins->isEmpty()) {
                return;
            }

            $displayName = trim((string) $providerName);
            $body = $displayName !== ''
                ? "مزود جديد بانتظار المراجعة: {$displayName}"
                : 'يوجد مزود جديد بانتظار المراجعة';
            $title = 'إشعار إداري';

            // Avoid spamming duplicate unread rows for the same admin + message within a short window.
            $freshAdmins = $allActiveAdmins->filter(function (User $admin) use ($body) {
                return ! $admin->notifications()
                    ->where('message', $body)
                    ->where('created_at', '>=', now()->subMinutes(10))
                    ->exists();
            })->values();

            if ($freshAdmins->isNotEmpty()) {
                $notifications->createForUsers($freshAdmins, 'general', $body, $title);
            }

            $adminIds = $allActiveAdmins
                ->filter(fn (User $user) => $user->deviceTokens->isNotEmpty())
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->values()
                ->all();

            if ($adminIds !== []) {
                SendFirebasePushNotification::dispatch(
                    $adminIds,
                    $title,
                    $body,
                    [
                        'type' => 'general',
                        'title' => $title,
                        'body' => $body,
                    ]
                );
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
