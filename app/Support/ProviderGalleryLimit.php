<?php

namespace App\Support;

use App\Models\ProviderGallery;
use App\Models\ProviderProfile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProviderGalleryLimit
{
    public static function standardMax(): int
    {
        return max(1, (int) config('lumixy.max_gallery_images', 30));
    }

    public static function featuredMax(): int
    {
        return max(self::standardMax(), (int) config('lumixy.max_gallery_images_featured', 40));
    }

    public static function maxFor(?ProviderProfile $profile): int
    {
        return $profile && $profile->is_featured
            ? self::featuredMax()
            : self::standardMax();
    }

    public static function max(): int
    {
        return self::standardMax();
    }

    public static function countFor(ProviderProfile $profile): int
    {
        return ProviderGallery::query()
            ->where('provider_profile_id', $profile->id)
            ->count();
    }

    public static function remainingFor(ProviderProfile $profile): int
    {
        return max(0, self::maxFor($profile) - self::countFor($profile));
    }

    public static function assertCanAdd(ProviderProfile $profile): void
    {
        $max = self::maxFor($profile);

        if (self::countFor($profile) >= $max) {
            throw ValidationException::withMessages([
                'image' => [self::message($max)],
            ]);
        }
    }

    public static function assertCanAddLocked(ProviderProfile $profile): void
    {
        $max = self::maxFor($profile);

        $count = ProviderGallery::query()
            ->where('provider_profile_id', $profile->id)
            ->lockForUpdate()
            ->count();

        if ($count >= $max) {
            throw ValidationException::withMessages([
                'image' => [self::message($max)],
            ]);
        }
    }

    public static function message(?int $max = null): string
    {
        $max = $max ?? self::standardMax();

        return 'الحد الأقصى '.$max.' صورة في معرض الأعمال.';
    }

    public static function transaction(callable $callback)
    {
        return DB::transaction($callback);
    }
}
