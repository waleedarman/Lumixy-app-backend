<?php

namespace App\Services;

use App\Models\City;
use App\Models\ProviderProfile;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Models\UserNotification;
use App\Support\PublicApiCache;
use Illuminate\Support\Facades\Cache;

/**
 * Shared catalog loaders for public endpoints and /api/bootstrap.
 * Reuses PublicApiCache (including Phase 1 stampede locks).
 */
class CatalogBootstrapService
{
    public function __construct(
        protected AppContactSettingService $appContact,
    ) {}

    public function cities()
    {
        return PublicApiCache::rememberLookup('cities', fn () =>
            City::query()
                ->select(['id', 'name', 'parent_id', 'sort_order', 'is_active', 'latitude', 'longitude'])
                ->where('is_active', true)
                ->whereNull('parent_id')
                ->with(['children' => function ($query) {
                    $query->select(['id', 'name', 'parent_id', 'sort_order', 'is_active', 'latitude', 'longitude'])
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('name');
                }])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->toArray()
        );
    }

    public function categories()
    {
        return PublicApiCache::rememberLookup('categories', fn () =>
            ServiceCategory::query()
                ->select(['id', 'name', 'icon', 'sort_order', 'is_active'])
                ->where('is_active', true)
                ->with(['subcategories' => function ($query) {
                    $query->select(['id', 'name', 'service_category_id', 'sort_order', 'is_active'])
                        ->where('is_active', true)
                        ->orderBy('sort_order')
                        ->orderBy('name');
                }])
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->toArray()
        );
    }

    public function promotionsPayload(): array
    {
        return PublicApiCache::rememberLookup('promotions:active', function () {
            $items = \App\Models\Promotion::query()
                ->publiclyVisible()
                ->ordered()
                ->get();

            if ($items->isEmpty()) {
                return [
                    'section' => [
                        'visible' => false,
                        'show_title' => false,
                        'show_sponsored_badge' => false,
                    ],
                    'promotions' => [],
                ];
            }

            $first = $items->first();

            return [
                'section' => [
                    'visible' => true,
                    'show_title' => (bool) $first->show_section_title,
                    'show_sponsored_badge' => (bool) $first->show_sponsored_badge,
                ],
                'promotions' => $items->values()->toArray(),
            ];
        });
    }

    public function appContact(): array
    {
        return PublicApiCache::rememberLookup('app_contact', fn () =>
            $this->appContact->toPublicArray(),
            300
        );
    }

    public function visibleProvidersQuery()
    {
        return ProviderProfile::with([
            'gallery:id,provider_profile_id,image_url,sort_order',
            'city.parent',
            'category',
            'subServices',
            'latestApplication',
            'user:id,full_name,avatar_url,phone',
        ])
            ->where('is_publicly_visible', true)
            ->where(function ($query) {
                $query->whereNull('subscription_started_at')
                    ->orWhere('subscription_started_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('subscription_ends_at')
                    ->orWhere('subscription_ends_at', '>=', now());
            });
    }

    /**
     * @return array<string, mixed>
     */
    public function providersPage(int $page = 1, ?string $cityId = null, ?string $categoryId = null, ?string $subServiceId = null): array
    {
        $query = $this->visibleProvidersQuery();

        if ($cityId) {
            $query->where('city_id', $cityId);
        }
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }
        if ($subServiceId) {
            $query->whereHas('subServices', function ($q) use ($subServiceId) {
                $q->where('service_subcategories.id', $subServiceId);
            });
        }

        $now = now();
        $page = max(1, $page);
        $cacheKey = http_build_query([
            'page' => $page,
            'city_id' => $cityId,
            'category_id' => $categoryId,
            'sub_service_id' => $subServiceId,
        ]);

        return PublicApiCache::rememberProviders("providers:{$cacheKey}", function () use ($query, $now, $page) {
            return (clone $query)
                ->orderByRaw(
                    'CASE
                        WHEN is_featured = 1
                         AND (subscription_started_at IS NULL OR subscription_started_at <= ?)
                         AND (subscription_ends_at IS NULL OR subscription_ends_at >= ?)
                        THEN 0
                        ELSE 1
                    END',
                    [$now, $now]
                )
                ->latest('provider_profiles.created_at')
                ->orderByDesc('provider_profiles.id')
                ->paginate(12, ['*'], 'page', $page)
                ->toArray();
        });
    }

    public function publicCatalogVersionToken(): string
    {
        $lookups = Cache::get('public_api:lookups_version', '0');
        $providers = Cache::get('public_api:providers_version', '0');

        return hash('sha256', "lookups:{$lookups}|providers:{$providers}");
    }

    public function slimProviderUser(User $user): array
    {
        $user->loadMissing([
            'providerProfile:id,user_id,provider_name,profile_image,bio,category_id,city_id,whatsapp_number,instagram_username,facebook_url,onboarding_step,is_featured,is_profile_completed,is_publicly_visible,subscription_type,subscription_started_at,subscription_ends_at,latitude,longitude',
            'providerProfile.city:id,name,parent_id',
            'providerProfile.category:id,name,icon',
            'providerProfile.subServices:id,name,service_category_id',
            'providerProfile.latestApplication',
        ]);

        $profile = $user->providerProfile;
        $payload = [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
            'status' => $user->status,
            'provider_profile' => null,
        ];

        if ($profile) {
            $payload['provider_profile'] = [
                'id' => $profile->id,
                'provider_name' => $profile->provider_name,
                'profile_image' => $profile->profile_image,
                'bio' => $profile->bio,
                'category_id' => $profile->category_id,
                'city_id' => $profile->city_id,
                'whatsapp_number' => $profile->whatsapp_number,
                'instagram_username' => $profile->instagram_username,
                'facebook_url' => $profile->facebook_url,
                'onboarding_step' => $profile->onboarding_step,
                'is_featured' => $profile->is_featured,
                'is_profile_completed' => $profile->is_profile_completed,
                'is_publicly_visible' => $profile->is_publicly_visible,
                'subscription_type' => $profile->subscription_type,
                'subscription_started_at' => $profile->subscription_started_at,
                'subscription_ends_at' => $profile->subscription_ends_at,
                'latitude' => $profile->latitude,
                'longitude' => $profile->longitude,
                'subscription_status' => $profile->subscription_status,
                'is_subscription_active' => $profile->is_subscription_active,
                'is_currently_featured' => $profile->is_currently_featured,
                'gallery_limit' => $profile->gallery_limit,
                'city' => $profile->city,
                'category' => $profile->category,
                'sub_services' => $profile->subServices,
                'latest_application' => $profile->latestApplication,
            ];
        }

        return $payload;
    }

    public function slimAdminUser(User $user): array
    {
        return [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $user->avatar_url,
            'role' => $user->role,
            'status' => $user->status,
            'is_super_admin' => (bool) $user->is_super_admin,
        ];
    }

    public function notificationsPayload(User $user): array
    {
        $retentionDays = max(1, (int) config('lumixy.notification_retention_days', 7));
        $cutoff = now()->subDays($retentionDays);

        UserNotification::query()
            ->where('user_id', $user->id)
            ->where('created_at', '<', $cutoff)
            ->delete();

        $notifications = UserNotification::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $cutoff)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (UserNotification $item) => [
                'id' => $item->id,
                'user_id' => $item->user_id,
                'type' => $item->type,
                'title' => $item->title,
                'message' => $item->message,
                'created_at' => optional($item->created_at)?->toISOString(),
                'read' => $item->read_at !== null,
            ])
            ->values()
            ->all();

        $unread = UserNotification::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', $cutoff)
            ->whereNull('read_at')
            ->count();

        return [
            'notifications' => $notifications,
            'unread_count' => $unread,
        ];
    }
}
