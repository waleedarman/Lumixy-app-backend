<?php

namespace Tests\Unit;

use App\Models\ProviderProfile;
use App\Support\ProviderGalleryLimit;
use Tests\TestCase;

class ProviderGalleryLimitTest extends TestCase
{
    public function test_standard_plan_is_limited_to_twenty_images(): void
    {
        config(['lumixy.max_gallery_images' => 20]);

        $profile = new ProviderProfile();
        $profile->is_featured = false;

        $this->assertSame(20, ProviderGalleryLimit::standardMax());
        $this->assertSame(20, ProviderGalleryLimit::maxFor($profile));
        $this->assertSame('الحد الأقصى 20 صورة في معرض الأعمال.', ProviderGalleryLimit::message(20));
    }

    public function test_featured_plan_is_limited_to_forty_images(): void
    {
        config([
            'lumixy.max_gallery_images' => 20,
            'lumixy.max_gallery_images_featured' => 40,
        ]);

        $profile = new ProviderProfile();
        $profile->is_featured = true;

        $this->assertSame(40, ProviderGalleryLimit::featuredMax());
        $this->assertSame(40, ProviderGalleryLimit::maxFor($profile));
    }

    public function test_featured_limit_never_drops_below_standard_limit(): void
    {
        config([
            'lumixy.max_gallery_images' => 25,
            'lumixy.max_gallery_images_featured' => 5,
        ]);

        $this->assertSame(25, ProviderGalleryLimit::featuredMax());
    }
}
