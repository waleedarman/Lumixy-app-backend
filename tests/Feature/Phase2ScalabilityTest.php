<?php

namespace Tests\Feature;

use App\Models\ProviderApplication;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AdminStatsCache;
use App\Services\ProviderVisibilityService;
use App\Support\PublicApiCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class Phase2ScalabilityTest extends TestCase
{
    use RefreshDatabase;

    protected function createApprovedProvider(array $profileOverrides = []): array
    {
        $user = User::factory()->create([
            'role' => 'provider',
            'status' => 'active',
        ]);

        $profile = new ProviderProfile(array_merge([
            'provider_name' => 'Visible Provider',
        ], $profileOverrides));
        $profile->forceFill([
            'user_id' => $user->id,
            'is_profile_completed' => true,
            'is_publicly_visible' => false,
        ])->save();

        ProviderApplication::create([
            'provider_profile_id' => $profile->id,
            'application_status' => 'approved',
            'submitted_at' => now(),
        ]);

        app(ProviderVisibilityService::class)->sync($profile->fresh());

        return [$user, $profile->fresh()];
    }

    protected function bearerToken(User $user, string $ability): string
    {
        return $user->createToken('phase2-test', [$ability])->plainTextToken;
    }

    #[Test]
    public function bootstrap_guest_returns_catalog_without_private_fields(): void
    {
        [, $profile] = $this->createApprovedProvider();

        $response = $this->getJson('/api/bootstrap');

        $response->assertOk()
            ->assertJsonPath('role', 'guest')
            ->assertJsonPath('user', null)
            ->assertJsonPath('notifications', [])
            ->assertJsonPath('unread_count', 0)
            ->assertJsonStructure([
                'role',
                'server_time',
                'catalog' => [
                    'cities',
                    'categories',
                    'promotions',
                    'providers',
                    'providers_meta' => [
                        'current_page',
                        'last_page',
                        'per_page',
                        'total',
                        'has_more',
                    ],
                    'app_contact',
                ],
            ]);

        $ids = collect($response->json('catalog.providers'))->pluck('id');
        $this->assertTrue($ids->contains($profile->id));
        $this->assertSame(1, $response->json('catalog.providers_meta.current_page'));
    }

    #[Test]
    public function bootstrap_provider_returns_slim_user_and_own_notifications_only(): void
    {
        [$provider, $profile] = $this->createApprovedProvider(['provider_name' => 'My Shop']);
        $other = User::factory()->create(['role' => 'provider', 'status' => 'active']);

        UserNotification::create([
            'user_id' => $provider->id,
            'type' => 'system',
            'title' => 'Hello',
            'message' => 'Mine',
        ]);
        UserNotification::create([
            'user_id' => $other->id,
            'type' => 'system',
            'title' => 'Secret',
            'message' => 'Not yours',
        ]);

        $token = $this->bearerToken($provider, 'provider');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/bootstrap');

        $response->assertOk()
            ->assertJsonPath('role', 'provider')
            ->assertJsonPath('user.id', $provider->id)
            ->assertJsonPath('user.provider_profile.id', $profile->id)
            ->assertJsonPath('unread_count', 1);

        $messages = collect($response->json('notifications'))->pluck('message');
        $this->assertTrue($messages->contains('Mine'));
        $this->assertFalse($messages->contains('Not yours'));

        // Slim: no full gallery / applications dump on bootstrap user profile.
        $this->assertArrayNotHasKey('gallery', $response->json('user.provider_profile') ?? []);
        $this->assertArrayNotHasKey('applications', $response->json('user.provider_profile') ?? []);
        $this->assertArrayHasKey('latest_application', $response->json('user.provider_profile') ?? []);
    }

    #[Test]
    public function bootstrap_admin_returns_admin_user_without_provider_profile(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_super_admin' => true,
        ]);

        UserNotification::create([
            'user_id' => $admin->id,
            'type' => 'system',
            'message' => 'Admin note',
        ]);

        $token = $this->bearerToken($admin, 'admin');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/bootstrap');

        $response->assertOk()
            ->assertJsonPath('role', 'admin')
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonPath('user.is_super_admin', true)
            ->assertJsonPath('unread_count', 1);

        $this->assertArrayNotHasKey('provider_profile', $response->json('user') ?? []);
    }

    #[Test]
    public function bootstrap_does_not_return_every_provider_page(): void
    {
        for ($i = 0; $i < 15; $i++) {
            $this->createApprovedProvider(['provider_name' => "Provider {$i}"]);
        }

        $response = $this->getJson('/api/bootstrap')->assertOk();

        $providers = $response->json('catalog.providers');
        $meta = $response->json('catalog.providers_meta');

        $this->assertLessThanOrEqual(12, count($providers));
        $this->assertSame(1, $meta['current_page']);
        $this->assertTrue($meta['has_more']);
        $this->assertGreaterThan(12, $meta['total']);
    }

    #[Test]
    public function bootstrap_authorization_ignores_wrong_token_ability_private_payload(): void
    {
        $provider = User::factory()->create([
            'role' => 'provider',
            'status' => 'active',
        ]);

        // Admin ability on a provider-role user should not unlock provider private payload.
        $token = $this->bearerToken($provider, 'admin');

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/bootstrap');

        $response->assertOk()->assertJsonPath('role', 'provider');
        $this->assertNull($response->json('user'));
        $this->assertSame([], $response->json('notifications'));
    }

    #[Test]
    public function public_providers_only_include_is_publicly_visible_true(): void
    {
        [, $visible] = $this->createApprovedProvider(['provider_name' => 'Visible']);

        $hiddenUser = User::factory()->create(['role' => 'provider', 'status' => 'active']);
        $hidden = new ProviderProfile(['provider_name' => 'Hidden']);
        $hidden->forceFill([
            'user_id' => $hiddenUser->id,
            'is_profile_completed' => true,
            'is_publicly_visible' => false,
        ])->save();
        ProviderApplication::create([
            'provider_profile_id' => $hidden->id,
            'application_status' => 'pending',
            'submitted_at' => now(),
        ]);

        $response = $this->getJson('/api/providers?page=1')->assertOk();
        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($visible->id));
        $this->assertFalse($ids->contains($hidden->id));
    }

    #[Test]
    public function approving_provider_synchronizes_is_publicly_visible(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_super_admin' => true,
        ]);
        $providerUser = User::factory()->create([
            'role' => 'provider',
            'status' => 'pending',
        ]);
        $profile = new ProviderProfile(['provider_name' => 'Pending Shop']);
        $profile->forceFill([
            'user_id' => $providerUser->id,
            'is_profile_completed' => true,
            'is_publicly_visible' => false,
        ])->save();
        ProviderApplication::create([
            'provider_profile_id' => $profile->id,
            'application_status' => 'pending',
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin, ['admin']);

        $this->postJson("/api/admin/providers/{$profile->id}/approve", [], [
            'Idempotency-Key' => 'phase2-visibility-approve-0001',
        ])->assertOk();

        $this->assertTrue((bool) $profile->fresh()->is_publicly_visible);
        $this->assertSame('active', $providerUser->fresh()->status);
    }

    #[Test]
    public function rejecting_provider_clears_is_publicly_visible(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_super_admin' => true,
        ]);
        [$providerUser, $profile] = $this->createApprovedProvider();
        $this->assertTrue((bool) $profile->is_publicly_visible);

        Sanctum::actingAs($admin, ['admin']);

        $this->postJson("/api/admin/providers/{$profile->id}/reject", [
            'rejection_reason' => 'Incomplete docs',
        ], [
            'Idempotency-Key' => 'phase2-visibility-reject-0001',
        ])->assertOk();

        $this->assertFalse((bool) $profile->fresh()->is_publicly_visible);
    }

    #[Test]
    public function bootstrap_etag_returns_304_when_unchanged(): void
    {
        Cache::flush();
        $this->createApprovedProvider();

        $first = $this->getJson('/api/bootstrap')->assertOk();
        $etag = $first->headers->get('ETag');
        $this->assertNotEmpty($etag);

        $second = $this->withHeader('If-None-Match', $etag)
            ->get('/api/bootstrap');

        $second->assertStatus(304);
    }

    #[Test]
    public function bootstrap_reuses_public_api_cache_for_catalog(): void
    {
        Cache::flush();
        PublicApiCache::flushLookups();
        PublicApiCache::flushProviders();

        $this->createApprovedProvider();

        $this->getJson('/api/bootstrap')->assertOk();
        $this->getJson('/api/cities')->assertOk();
        $this->getJson('/api/service-categories')->assertOk();
        $this->getJson('/api/promotions')->assertOk();
        $this->getJson('/api/providers?page=1')->assertOk();

        // Second bootstrap should still succeed (cache hit path) without error.
        $this->getJson('/api/bootstrap')
            ->assertOk()
            ->assertJsonPath('role', 'guest');
    }

    #[Test]
    public function admin_dashboard_stats_are_cached_briefly(): void
    {
        Cache::flush();
        AdminStatsCache::flush();

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_super_admin' => true,
        ]);
        Sanctum::actingAs($admin, ['admin']);

        $first = $this->getJson('/api/admin/dashboard/stats')->assertOk()->json();
        $this->createApprovedProvider(['provider_name' => 'After Cache']);
        // Without flush, cached payload should still match first response.
        $second = $this->getJson('/api/admin/dashboard/stats')->assertOk()->json();
        $this->assertSame($first, $second);

        AdminStatsCache::flush();
        $third = $this->getJson('/api/admin/dashboard/stats')->assertOk()->json();
        $this->assertNotSame($first['active'] ?? null, $third['active'] ?? '__missing__');
    }
}
