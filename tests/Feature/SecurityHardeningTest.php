<?php

namespace Tests\Feature;

use App\Jobs\SendPasswordResetOtp;
use App\Mail\PasswordResetOtpMail;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Services\FirebaseIdentityService;
use App\Services\SecurityAuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function admin_password_login_issues_a_token_without_a_verification_code(): void
    {
        Mail::fake();
        $this->mock(SecurityAuditService::class)
            ->shouldReceive('record')
            ->once();

        $admin = User::factory()->create([
            'email' => 'mfa-admin@example.com',
            'password' => Hash::make('StrongPassword123!'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->postJson('/api/admin/auth/login', [
            'email' => $admin->email,
            'password' => 'StrongPassword123!',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonMissing(['mfa_required' => true])
            ->assertJsonMissingPath('challenge_id');

        Mail::assertNothingQueued();
    }

    #[Test]
    public function unknown_password_reset_email_is_rejected_without_sending_a_code(): void
    {
        Queue::fake();

        $this->postJson('/api/auth/forgot-password', ['email' => 'missing@example.com'])
            ->assertNotFound()
            ->assertExactJson(['message' => 'This email address is not registered.']);

        Queue::assertNotPushed(SendPasswordResetOtp::class);
    }

    #[Test]
    public function known_password_reset_email_queues_a_code(): void
    {
        Queue::fake();

        $user = User::factory()->create(['email' => 'known@example.com']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'known@example.com'])
            ->assertAccepted()
            ->assertExactJson(['message' => 'A reset code has been sent.']);

        Queue::assertPushed(
            SendPasswordResetOtp::class,
            fn (SendPasswordResetOtp $job) => $job->email === $user->email
        );
    }

    #[Test]
    public function suspended_provider_is_blocked_even_with_a_valid_token(): void
    {
        $user = User::factory()->create(['status' => 'suspended', 'role' => 'provider']);
        Sanctum::actingAs($user, ['provider']);

        $this->getJson('/api/provider/me')->assertForbidden();
    }

    #[Test]
    public function token_ability_must_match_the_database_role(): void
    {
        $user = User::factory()->create(['status' => 'active', 'role' => 'provider']);
        Sanctum::actingAs($user, ['admin']);

        $this->getJson('/api/provider/me')->assertForbidden();
    }

    #[Test]
    public function bunny_media_upload_requires_authentication(): void
    {
        $this->postJson('/api/provider/profile/image/cloudinary', [])
            ->assertUnauthorized();

        $this->postJson('/api/admin/promotions/media', [])
            ->assertUnauthorized();
    }

    #[Test]
    public function api_responses_include_security_headers(): void
    {
        $this->getJson('/api/test')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }

    #[Test]
    public function inactive_accounts_cannot_use_shared_authenticated_endpoints(): void
    {
        $user = User::factory()->create(['status' => 'inactive', 'role' => 'provider']);
        Sanctum::actingAs($user, ['provider']);

        $this->getJson('/api/notifications')->assertForbidden();
        $this->postJson('/api/devices/register', ['token' => 'test-token'])->assertForbidden();
    }

    #[Test]
    public function admin_can_update_another_admin_status(): void
    {
        $admin = User::factory()->admin()->create();
        $admin->forceFill(['is_super_admin' => true])->save();
        $target = User::factory()->admin()->create();
        $target->forceFill(['is_super_admin' => false])->save();

        Sanctum::actingAs($admin, ['admin']);

        $this->putJson("/api/admin/admins/{$target->id}", ['status' => 'inactive'])
            ->assertOk()
            ->assertJsonPath('admin.status', 'inactive');

        $this->assertSame('inactive', $target->fresh()->status);
    }

    #[Test]
    public function admin_cannot_update_their_own_account_via_team_endpoint(): void
    {
        $admin = User::factory()->admin()->create();
        $admin->forceFill(['is_super_admin' => true])->save();

        Sanctum::actingAs($admin, ['admin']);

        $this->putJson("/api/admin/admins/{$admin->id}", ['status' => 'inactive'])
            ->assertUnprocessable();
    }

    #[Test]
    public function super_admin_can_delete_another_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $admin->forceFill(['is_super_admin' => true])->save();
        $target = User::factory()->admin()->create();
        $target->forceFill(['is_super_admin' => false])->save();

        Sanctum::actingAs($admin, ['admin']);

        $this->deleteJson("/api/admin/admins/{$target->id}", [], [
            'Idempotency-Key' => 'admin-delete-test-000001',
        ])->assertOk();

        $this->assertNull($target->fresh());
    }

    #[Test]
    public function ordinary_admin_cannot_create_another_admin(): void
    {
        $admin = User::factory()->create([
            'status' => 'active',
            'role' => 'admin',
            'is_super_admin' => false,
        ]);
        Sanctum::actingAs($admin, ['admin']);

        $this->postJson('/api/admin/admins', [
            'full_name' => 'Blocked Admin',
            'email' => 'blocked-admin@example.com',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ], ['Idempotency-Key' => 'ordinary-admin-test-0001'])->assertForbidden();
    }

    #[Test]
    public function idempotency_key_replays_the_original_admin_creation_response(): void
    {
        $admin = User::factory()->create([
            'status' => 'active',
            'role' => 'admin',
            'is_super_admin' => true,
        ]);
        Sanctum::actingAs($admin, ['admin']);
        $payload = [
            'full_name' => 'New Admin',
            'email' => 'new-admin@example.com',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ];
        $headers = ['Idempotency-Key' => 'admin-create-test-000001'];

        $this->postJson('/api/admin/admins', $payload, $headers)
            ->assertCreated()
            ->assertHeader('Idempotency-Replayed', 'false');
        $this->postJson('/api/admin/admins', $payload, $headers)
            ->assertCreated()
            ->assertHeader('Idempotency-Replayed', 'true');

        $this->assertSame(1, User::where('email', 'new-admin@example.com')->count());
    }

    #[Test]
    public function device_registration_does_not_return_the_plaintext_token(): void
    {
        $user = User::factory()->create(['status' => 'active', 'role' => 'provider']);
        Sanctum::actingAs($user, ['provider']);

        $this->postJson('/api/devices/register', ['token' => 'secret-device-token'])
            ->assertOk()
            ->assertJsonMissing(['token' => 'secret-device-token'])
            ->assertJsonMissingPath('device_token.token_hash');
    }

    #[Test]
    public function oversized_json_requests_are_rejected(): void
    {
        $this->postJson('/api/auth/forgot-password', [
            'email' => 'person@example.com',
            'padding' => str_repeat('x', 1024 * 1024),
        ])
            ->assertStatus(413);
    }

    #[Test]
    public function privilege_fields_are_not_mass_assignable(): void
    {
        $user = new User([
            'full_name' => 'Attacker',
            'email' => 'attacker@example.com',
            'password' => 'StrongPassword123!',
            'role' => 'admin',
            'status' => 'active',
            'is_super_admin' => true,
        ]);
        $profile = new ProviderProfile([
            'provider_name' => 'Attacker Provider',
            'is_featured' => true,
            'subscription_type' => 'featured',
            'is_profile_completed' => true,
        ]);

        $this->assertNull($user->role);
        $this->assertNull($user->status);
        $this->assertFalse((bool) $user->is_super_admin);
        $this->assertFalse((bool) $profile->is_featured);
        $this->assertNull($profile->subscription_type);
        $this->assertFalse((bool) $profile->is_profile_completed);
    }

    #[Test]
    public function admin_must_confirm_password_before_changing_email(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => Hash::make('CurrentPassword123!'),
            'status' => 'active',
            'role' => 'admin',
        ]);
        Sanctum::actingAs($admin, ['admin']);

        $this->putJson('/api/admin/auth/profile', [
            'full_name' => $admin->full_name,
            'email' => 'changed@example.com',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');

        $this->assertSame('admin@example.com', $admin->fresh()->email);
    }

    #[Test]
    public function google_login_requires_a_verified_google_identity(): void
    {
        $firebase = Mockery::mock(FirebaseIdentityService::class);
        $firebase->shouldReceive('verifyIdToken')->once()->andReturn([
            'firebase_uid' => 'firebase-user-id',
            'email' => 'unverified@example.com',
            'full_name' => 'Unverified User',
            'phone' => null,
            'avatar_url' => null,
            'email_verified' => false,
            'provider_ids' => ['google.com'],
        ]);
        $this->app->instance(FirebaseIdentityService::class, $firebase);

        $this->postJson('/api/provider/auth/google', [
            'id_token' => 'test-token',
        ])->assertUnprocessable();

        $this->assertDatabaseMissing('users', ['email' => 'unverified@example.com']);
    }

    #[Test]
    public function provider_registration_sets_protected_role_and_status_explicitly(): void
    {
        $this->postJson('/api/provider/auth/register', [
            'full_name' => 'Secure Provider',
            'email' => 'secure-provider@example.com',
            'phone' => '0599000000',
            'password' => 'StrongPassword123!',
            'password_confirmation' => 'StrongPassword123!',
        ])->assertCreated();

        $this->assertDatabaseHas('users', [
            'email' => 'secure-provider@example.com',
            'role' => 'provider',
            'status' => 'inactive',
        ]);
        $this->assertDatabaseHas('provider_profiles', [
            'provider_name' => 'Secure Provider',
        ]);
    }

    #[Test]
    public function password_reset_job_creates_an_otp_only_for_existing_users(): void
    {
        Mail::fake();
        User::factory()->create(['email' => 'known@example.com']);

        (new SendPasswordResetOtp('known@example.com'))->handle();
        (new SendPasswordResetOtp('unknown@example.com'))->handle();

        $this->assertDatabaseHas('password_reset_otps', ['email' => 'known@example.com']);
        $this->assertDatabaseMissing('password_reset_otps', ['email' => 'unknown@example.com']);
        Mail::assertSent(PasswordResetOtpMail::class, 1);
    }
}
