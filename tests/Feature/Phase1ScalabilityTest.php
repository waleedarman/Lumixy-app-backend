<?php

namespace Tests\Feature;

use App\Jobs\SendFirebasePushNotification;
use App\Models\ProviderApplication;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Support\PublicApiCache;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class Phase1ScalabilityTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function approving_a_provider_queues_firebase_push_instead_of_sending_inline(): void
    {
        Queue::fake();

        $admin = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
            'is_super_admin' => true,
        ]);
        $providerUser = User::factory()->create([
            'role' => 'provider',
            'status' => 'pending',
        ]);

        $profile = new ProviderProfile([
            'provider_name' => 'Queued Push Provider',
        ]);
        $profile->forceFill([
            'user_id' => $providerUser->id,
            'is_profile_completed' => true,
        ])->save();

        ProviderApplication::create([
            'provider_profile_id' => $profile->id,
            'application_status' => 'pending',
            'submitted_at' => now(),
        ]);

        Sanctum::actingAs($admin, ['admin']);

        $this->postJson("/api/admin/providers/{$profile->id}/approve", [], [
            'Idempotency-Key' => 'phase1-approve-test-000001',
        ])->assertOk();

        Queue::assertPushed(
            SendFirebasePushNotification::class,
            fn (SendFirebasePushNotification $job) => in_array((string) $providerUser->id, $job->userIds, true)
        );
    }

    #[Test]
    public function public_api_cache_serves_cached_payload_and_flushes_via_version_bump(): void
    {
        Cache::flush();

        $calls = 0;
        $first = PublicApiCache::rememberLookup('phase1-test', function () use (&$calls) {
            $calls++;

            return ['n' => $calls];
        }, 60);

        $second = PublicApiCache::rememberLookup('phase1-test', function () use (&$calls) {
            $calls++;

            return ['n' => $calls];
        }, 60);

        $this->assertSame(['n' => 1], $first);
        $this->assertSame(['n' => 1], $second);
        $this->assertSame(1, $calls);

        PublicApiCache::flushLookups();

        $third = PublicApiCache::rememberLookup('phase1-test', function () use (&$calls) {
            $calls++;

            return ['n' => $calls];
        }, 60);

        $this->assertSame(['n' => 2], $third);
        $this->assertSame(2, $calls);
    }
}
