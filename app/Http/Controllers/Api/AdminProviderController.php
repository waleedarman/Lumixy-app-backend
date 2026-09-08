<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendFirebasePushNotification;
use App\Support\SubscriptionPeriod;
use App\Models\ProviderProfile;
use App\Services\AdminStatsCache;
use App\Services\ProviderMediaService;
use App\Services\ProviderVisibilityService;
use App\Services\SecurityAuditService;
use App\Services\UserNotificationService;
use App\Support\PublicApiCache;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class AdminProviderController extends Controller
{
    public function __construct(
        protected SecurityAuditService $securityAudit,
        protected ProviderMediaService $providerMedia,
        protected ProviderVisibilityService $visibility,
    ) {}

    protected function json($data, int $status = 200)
    {
        return response()->json($data, $status, [], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    protected function providerListingQuery()
    {
        return ProviderProfile::with([
            'user:id,full_name,email,phone,status,avatar_url,role',
            'city:id,name,parent_id',
            'city.parent:id,name,parent_id',
            'category:id,name,icon',
            'subServices:id,name,service_category_id',
            'latestApplication',
            'gallery' => function ($query) {
                $query->select('id', 'provider_profile_id', 'image_url', 'sort_order')
                    ->orderBy('sort_order')
                    ->orderBy('created_at')
                    ->limit(4);
            },
        ])
            ->whereHas('user', function ($query) {
                $query->where('role', 'provider');
            });
    }

    protected function applyAdminProviderListingOrder($query)
    {
        $now = now();

        // Attention order for admins:
        // 0 = pending review (new registrants, not subscribed yet)
        // 1 = expired subscription (needs renewal)
        // 2 = everyone else
        return $query
            ->orderByRaw(
                'CASE
                    WHEN EXISTS (
                        SELECT 1 FROM provider_applications pa
                        WHERE pa.provider_profile_id = provider_profiles.id
                          AND pa.application_status = ?
                          AND pa.id = (
                              SELECT pa2.id FROM provider_applications pa2
                              WHERE pa2.provider_profile_id = provider_profiles.id
                              ORDER BY pa2.submitted_at DESC, pa2.id DESC
                              LIMIT 1
                          )
                    )
                    THEN 0
                    WHEN subscription_ends_at IS NOT NULL AND subscription_ends_at < ?
                    THEN 1
                    ELSE 2
                END',
                ['pending', $now]
            )
            ->orderByRaw(
                'CASE
                    WHEN subscription_ends_at IS NOT NULL AND subscription_ends_at < ?
                    THEN subscription_ends_at
                END ASC',
                [$now]
            )
            ->orderByDesc('provider_profiles.created_at')
            ->orderByDesc('provider_profiles.id');
    }

    protected function latestApplicationForReview(ProviderProfile $profile)
    {
        $application = $profile->applications()
            ->latest('submitted_at')
            ->first();

        if ($application) {
            return $application;
        }

        return $profile->applications()->create([
            'application_status' => 'pending',
            'submitted_at' => now(),
        ]);
    }

    public function pending()
    {
        return $this->json(
            $this->providerListingQuery()
                ->whereHas('latestApplication', function ($query) {
                    $query->where('application_status', 'pending');
                })
                ->latest()
                ->limit(100)
                ->get()
        );
    }

    public function index(Request $request)
    {
        $perPage = min(50, max(1, (int) $request->query('per_page', 15)));
        $search = trim((string) $request->query('search', ''));
        $filter = strtolower(trim((string) $request->query('filter', 'all')));

        $query = $this->providerListingQuery();

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($builder) use ($like) {
                $builder
                    ->where('provider_name', 'like', $like)
                    ->orWhereHas('user', function ($userQuery) use ($like) {
                        $userQuery
                            ->where('full_name', 'like', $like)
                            ->orWhere('email', 'like', $like)
                            ->orWhere('phone', 'like', $like);
                    });
            });
        }

        $now = now();
        $expiringSoonEnd = $now->copy()->addDays(SubscriptionPeriod::expiringSoonDays())->endOfDay();

        switch ($filter) {
            case 'pending':
                $query
                    ->whereHas('latestApplication', function ($applicationQuery) {
                        $applicationQuery->where('application_status', 'pending');
                    })
                    ->whereHas('user', function ($userQuery) {
                        $userQuery->whereNotIn('status', ['deactivated', 'disabled', 'suspended']);
                    });
                break;
            case 'active':
                $query
                    ->where('is_publicly_visible', true)
                    ->whereHas('user', function ($userQuery) {
                        $userQuery->where('status', 'active');
                    })
                    ->whereHas('latestApplication', function ($applicationQuery) {
                        $applicationQuery->where('application_status', 'approved');
                    });
                break;
            case 'deactivated':
                $query->where(function ($builder) {
                    $builder
                        ->whereHas('user', function ($userQuery) {
                            $userQuery->whereIn('status', ['deactivated', 'disabled', 'suspended']);
                        })
                        ->orWhereHas('latestApplication', function ($applicationQuery) {
                            $applicationQuery->where('application_status', 'rejected');
                        });
                });
                break;
            case 'expired':
                $query
                    ->whereNotNull('subscription_ends_at')
                    ->where('subscription_ends_at', '<', $now);
                break;
            case 'expiringsoon':
            case 'expiring_soon':
                $query
                    ->whereNotNull('subscription_ends_at')
                    ->where('subscription_ends_at', '>=', $now)
                    ->where('subscription_ends_at', '<=', $expiringSoonEnd);
                break;
            case 'featured':
                $query->where('is_featured', true);
                break;
            case 'all':
            default:
                break;
        }

        return $this->json(
            $this->applyAdminProviderListingOrder($query)->paginate($perPage)
        );
    }

    public function show(string $id)
    {
        return $this->json(
            ProviderProfile::with([
                'user',
                'city.parent',
                'category',
                'subServices',
                'gallery',
                'applications.reviewer',
            ])->whereHas('user', function ($query) {
                $query->where('role', 'provider');
            })->findOrFail($id)
        );
    }

    protected function afterProviderVisibilityChange(ProviderProfile $profile): void
    {
        $this->visibility->sync($profile->fresh(['user', 'latestApplication']) ?? $profile, flushPublicCache: false);
        PublicApiCache::flushProviders();
        AdminStatsCache::flush();
    }

    protected function trySendProviderNotification(
        ProviderProfile $profile,
        UserNotificationService $notifications,
        string $title,
        string $body,
        array $data = []
    ): void {
        try {
            $profile->loadMissing('user');
            $user = $profile->user;

            if (! $user) {
                return;
            }

            $notifications->createForUser(
                $user,
                (string) ($data['type'] ?? 'general'),
                $body,
                $title
            );

            SendFirebasePushNotification::dispatch(
                [(string) $user->id],
                $title,
                $body,
                $data + [
                    'provider_id' => (string) $profile->id,
                ]
            );
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    public function approve(Request $request, string $id, UserNotificationService $notifications)
    {
        $profile = ProviderProfile::with(['user', 'applications'])->findOrFail($id);

        $application = $this->latestApplicationForReview($profile);

        DB::transaction(function () use ($profile, $application, $request) {
            $startAt = now()->startOfDay();
            $endAt = SubscriptionPeriod::endFromStart($startAt);

            $application->update([
                'application_status' => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'notes' => null,
            ]);

            $profile->user->forceFill([
                'status' => 'active',
            ])->save();

            $profile->forceFill([
                'is_profile_completed' => true,
                'subscription_type' => $profile->is_featured ? 'featured' : 'standard',
                'subscription_started_at' => $startAt,
                'subscription_ends_at' => $endAt,
            ])->save();
        });
        $this->securityAudit->record($request, 'provider.approved', 'success', ['provider_id' => $profile->id]);

        $freshProfile = $profile->fresh()->load(['user', 'city.parent', 'category', 'subServices', 'latestApplication', 'applications']);
        $this->afterProviderVisibilityChange($freshProfile);

        $this->trySendProviderNotification(
            $freshProfile,
            $notifications,
            'تم قبول طلبك',
            'تم قبول طلبك، يمكنك الآن استخدام حسابك',
            [
                'type' => 'activation',
                'title' => 'تم قبول طلبك',
                'body' => 'تم قبول طلبك، يمكنك الآن استخدام حسابك',
            ]
        );

        return $this->json([
            'message' => 'Provider approved',
            'provider' => $freshProfile,
        ]);
    }

    public function reject(Request $request, string $id, UserNotificationService $notifications)
    {
        $data = $request->validate([
            'rejection_reason' => ['required', 'string', 'max:1000'],
        ]);

        $profile = ProviderProfile::with(['user', 'applications'])->findOrFail($id);

        $application = $this->latestApplicationForReview($profile);

        DB::transaction(function () use ($profile, $application, $request, $data) {
            $application->update([
                'application_status' => 'rejected',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'notes' => $data['rejection_reason'],
            ]);

            $profile->user->forceFill([
                'status' => 'inactive',
            ])->save();
        });
        $this->securityAudit->record($request, 'provider.rejected', 'success', ['provider_id' => $profile->id]);

        $freshProfile = $profile->fresh()->load(['user', 'city.parent', 'category', 'subServices', 'latestApplication', 'applications']);
        $this->afterProviderVisibilityChange($freshProfile);

        $this->trySendProviderNotification(
            $freshProfile,
            $notifications,
            'تم رفض طلبك',
            'تم رفض طلبك، يرجى مراجعة البيانات',
            [
                'type' => 'general',
                'title' => 'تم رفض طلبك',
                'body' => 'تم رفض طلبك، يرجى مراجعة البيانات',
            ]
        );

        return $this->json([
            'message' => 'Provider rejected',
            'provider' => $freshProfile,
        ]);
    }

    public function destroy(Request $request, string $id)
    {
        $profile = ProviderProfile::with('gallery')->findOrFail($id);
        $user = $profile->user;

        if (! $this->providerMedia->deleteAll($profile)) {
            \Log::warning('Provider media cleanup incomplete before delete.', [
                'provider_id' => $id,
            ]);
        }

        DB::transaction(function () use ($profile, $user) {
            $profile->delete();
            $user?->delete();
        });
        PublicApiCache::flushProviders();
        AdminStatsCache::flush();
        $this->securityAudit->record($request, 'provider.deleted', 'success', ['provider_id' => $id, 'user_id' => $user?->id]);

        return $this->json([
            'message' => 'Provider deleted successfully',
        ]);
    }

    public function suspend(Request $request, string $id, UserNotificationService $notifications)
    {
        $request->merge([
            'reason' => $request->input('reason') ?: null,
        ]);

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $profile = ProviderProfile::with(['applications', 'user'])->findOrFail($id);

        $latestApplication = $this->latestApplicationForReview($profile);

        DB::transaction(function () use ($profile, $latestApplication, $request, $data) {
            $profile->user->forceFill([
                'status' => 'suspended',
            ])->save();

            $profile->user->tokens()->delete();

            $profile->forceFill([
                'subscription_started_at' => null,
                'subscription_ends_at' => null,
            ])->save();

            if ($latestApplication) {
                $latestApplication->update([
                    'application_status' => 'rejected',
                    'reviewed_by' => $request->user()->id,
                    'reviewed_at' => now(),
                    'notes' => isset($data['reason']) && $data['reason'] !== ''
                        ? 'موقوف: '.$data['reason']
                        : 'موقوف بواسطة الإدارة',
                ]);
            }
        });
        $this->securityAudit->record($request, 'provider.suspended', 'success', ['provider_id' => $profile->id]);

        $freshProfile = $profile->fresh()->load(['user', 'city.parent', 'category', 'subServices', 'latestApplication', 'applications']);
        $this->afterProviderVisibilityChange($freshProfile);

        $this->trySendProviderNotification(
            $freshProfile,
            $notifications,
            'تم تعطيل حسابك مؤقتًا',
            'تم تعطيل حسابك مؤقتًا',
            [
                'type' => 'general',
                'title' => 'تم تعطيل حسابك مؤقتًا',
                'body' => 'تم تعطيل حسابك مؤقتًا',
            ]
        );

        return $this->json([
            'message' => 'Provider suspended',
            'provider' => $freshProfile,
        ]);
    }

    public function updateSubscription(Request $request, string $id, UserNotificationService $notifications)
    {
        $request->merge([
            'subscription_started_at' => $request->input('subscription_started_at') ?: null,
        ]);

        $data = $request->validate([
            'is_featured' => ['required', 'boolean'],
            'subscription_started_at' => ['nullable', 'date'],
        ]);

        $profile = ProviderProfile::findOrFail($id);

        $isFeatured = (bool) $data['is_featured'];
        $updates = [
            'is_featured' => $isFeatured,
            'subscription_type' => $isFeatured ? 'featured' : 'standard',
        ];

        if (! empty($data['subscription_started_at'])) {
            $startAt = Carbon::parse($data['subscription_started_at'])->startOfDay();
            $updates['subscription_started_at'] = $startAt;
            $updates['subscription_ends_at'] = SubscriptionPeriod::endFromStart($startAt);
        }

        $profile->forceFill($updates)->save();
        $this->securityAudit->record($request, 'provider.subscription_updated', 'success', ['provider_id' => $profile->id]);

        $freshProfile = $profile->fresh()->load(['user', 'city.parent', 'category', 'subServices', 'latestApplication', 'applications', 'gallery']);
        $this->afterProviderVisibilityChange($freshProfile);

        if ($isFeatured) {
            $this->trySendProviderNotification(
                $freshProfile,
                $notifications,
                'تمت ترقيتك إلى مزود مميز',
                'تمت ترقيتك إلى مزود مميز بنجاح.',
                [
                    'type' => 'general',
                    'title' => 'تمت ترقيتك إلى مزود مميز',
                    'body' => 'تمت ترقيتك إلى مزود مميز بنجاح.',
                ]
            );
        }

        return $this->json([
            'message' => 'Provider subscription updated successfully',
            'provider' => $freshProfile,
        ]);
    }

    public function renewSubscription(Request $request, string $id, UserNotificationService $notifications)
    {
        $profile = ProviderProfile::findOrFail($id);

        $currentEndAt = $profile->subscription_ends_at instanceof Carbon
            ? $profile->subscription_ends_at->copy()
            : null;

        if (! SubscriptionPeriod::isExpired($currentEndAt)) {
            return response()->json([
                'message' => 'لا يمكن تجديد الاشتراك قبل انتهائه. الاشتراك لمدة شهر واحد فقط.',
            ], 422);
        }

        $newStartAt = now()->startOfDay();
        $newEndAt = SubscriptionPeriod::endFromStart($newStartAt);

        $profile->forceFill([
            'subscription_started_at' => $newStartAt,
            'subscription_ends_at' => $newEndAt,
            'subscription_type' => $profile->is_featured ? 'featured' : 'standard',
            'last_subscription_reminder_at' => null,
            'subscription_expired_notified_at' => null,
        ])->save();
        $this->securityAudit->record($request, 'provider.subscription_renewed', 'success', ['provider_id' => $profile->id]);

        $freshProfile = $profile->fresh()->load(['user', 'city.parent', 'category', 'subServices', 'latestApplication', 'applications', 'gallery']);
        $this->afterProviderVisibilityChange($freshProfile);

        $this->trySendProviderNotification(
            $freshProfile,
            $notifications,
            'تم تجديد اشتراكك بنجاح',
            'تم تجديد اشتراكك لمدة شهر واحد.',
            [
                'type' => 'renewal',
                'title' => 'تم تجديد اشتراكك بنجاح',
                'body' => 'تم تجديد اشتراكك لمدة شهر واحد.',
            ]
        );

        return $this->json([
            'message' => 'Provider subscription renewed successfully',
            'provider' => $freshProfile,
        ]);
    }
}
