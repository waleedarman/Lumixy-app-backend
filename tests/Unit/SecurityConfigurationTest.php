<?php

namespace Tests\Unit;

use App\Models\ProviderGallery;
use App\Models\ProviderProfile;
use App\Models\User;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SecurityConfigurationTest extends TestCase
{
    #[Test]
    public function sensitive_bunny_storage_paths_are_hidden(): void
    {
        $profile = new ProviderProfile(['profile_image_path' => 'uploads/providers/x/secret.jpg']);
        $gallery = new ProviderGallery(['image_path' => 'uploads/providers/x/gallery/secret.jpg']);

        $this->assertArrayNotHasKey('profile_image_path', $profile->toArray());
        $this->assertArrayNotHasKey('image_path', $gallery->toArray());
    }

    #[Test]
    public function secure_transport_and_token_expiration_are_enabled_by_default(): void
    {
        $this->assertTrue((bool) config('services.firebase.verify_ssl'));
        $this->assertNull(config('sanctum.expiration'));
        $this->assertNull(config('lumixy.provider_token_lifetime_minutes'));
    }

    #[Test]
    public function trusted_hosts_and_privileged_mass_assignment_are_hardened(): void
    {
        $this->assertNotEmpty(config('app.trusted_hosts'));
        $this->assertNotContains('role', (new User)->getFillable());
        $this->assertNotContains('is_super_admin', (new User)->getFillable());
        $this->assertNotContains('is_featured', (new ProviderProfile)->getFillable());
        $this->assertNotContains('subscription_ends_at', (new ProviderProfile)->getFillable());
    }

    #[Test]
    public function perf_test_mode_is_disabled_by_default(): void
    {
        $this->assertFalse((bool) config('lumixy.perf_test_mode'));
        $this->assertFalse(\App\Support\LocalPerfTestMode::enabled());
    }

    #[Test]
    public function perf_test_mode_requires_local_environment(): void
    {
        config(['lumixy.perf_test_mode' => true]);

        // PHPUnit uses APP_ENV=testing, so the gate must stay closed.
        $this->assertFalse(\App\Support\LocalPerfTestMode::enabled());
    }

    #[Test]
    public function bunny_storage_api_key_lives_only_in_backend_config(): void
    {
        config([
            'bunny.storage_api_key' => 'secret-bunny-key',
            'bunny.storage_zone' => 'lumixy',
            'bunny.cdn_url' => 'https://example.b-cdn.net',
        ]);

        $this->assertSame('secret-bunny-key', config('bunny.storage_api_key'));
        $this->assertSame('lumixy', config('bunny.storage_zone'));
    }
}
