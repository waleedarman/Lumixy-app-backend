<?php

namespace Tests\Unit;

use App\Models\ProviderGallery;
use App\Models\User;
use App\Services\BunnyStorageService;
use App\Services\ProviderMediaService;
use App\Support\ProviderAvatar;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class ProviderMediaServiceTest extends TestCase
{
    use RefreshDatabase;

    private function makeProvider(array $profileAttributes = []): \App\Models\ProviderProfile
    {
        $user = User::factory()->create(['role' => 'provider', 'status' => 'active']);

        return $user->providerProfile()->create(array_merge([
            'provider_name' => 'Test Provider',
            'onboarding_step' => 4,
        ], $profileAttributes));
    }

    #[Test]
    public function delete_all_succeeds_for_external_placeholder_avatar_urls(): void
    {
        $profile = $this->makeProvider([
            'profile_image' => ProviderAvatar::placeholderUrl('Test Provider'),
            'profile_image_path' => null,
        ]);

        $service = app(ProviderMediaService::class);

        $this->assertTrue($service->deleteAll($profile));
    }

    #[Test]
    public function delete_all_succeeds_for_local_storage_paths(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('provider_gallery/test.jpg', 'image-bytes');

        $profile = $this->makeProvider([
            'profile_image' => 'provider_gallery/test.jpg',
            'profile_image_path' => null,
        ]);

        ProviderGallery::query()->create([
            'provider_profile_id' => $profile->id,
            'image_url' => 'provider_gallery/test.jpg',
            'sort_order' => 0,
        ]);

        $service = app(ProviderMediaService::class);

        $this->assertTrue($service->deleteAll($profile->fresh()->load('gallery')));
        $this->assertFalse(Storage::disk('public')->exists('provider_gallery/test.jpg'));
    }

    #[Test]
    public function delete_all_skips_bunny_when_not_configured(): void
    {
        config([
            'bunny.storage_zone' => '',
            'bunny.storage_api_key' => '',
            'bunny.cdn_url' => '',
        ]);

        $profile = $this->makeProvider([
            'profile_image' => 'https://example.b-cdn.net/uploads/providers/x/sample.jpg',
        ]);

        $profile->forceFill([
            'profile_image_path' => "uploads/providers/{$profile->id}/00000000-0000-4000-8000-000000000099.jpg",
        ])->save();

        $service = new ProviderMediaService(new BunnyStorageService());

        $this->assertTrue($service->deleteAll($profile));
        $this->assertFalse(app(BunnyStorageService::class)->isConfigured());
    }
}
