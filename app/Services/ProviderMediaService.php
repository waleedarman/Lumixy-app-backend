<?php

namespace App\Services;

use App\Models\ProviderProfile;
use Illuminate\Support\Facades\Storage;

class ProviderMediaService
{
    public function __construct(private readonly BunnyStorageService $bunny) {}

    public function deleteProfileImage(ProviderProfile $profile, ?string $url, ?string $path): bool
    {
        return $this->delete($profile, $url, $path);
    }

    public function deleteAll(ProviderProfile $profile): bool
    {
        $ok = $this->delete(
            $profile,
            $profile->getRawOriginal('profile_image'),
            $profile->getRawOriginal('profile_image_path')
        );

        foreach ($profile->gallery as $item) {
            $ok = $this->delete(
                $profile,
                $item->getRawOriginal('image_url'),
                $item->getRawOriginal('image_path')
            ) && $ok;
        }

        return $ok;
    }

    private function delete(ProviderProfile $profile, ?string $url, ?string $path): bool
    {
        $prefix = "uploads/providers/{$profile->id}/";
        $resolvedPath = $path ?: $this->bunny->extractPathFromUrl($url);

        if ($resolvedPath) {
            if (! str_starts_with($resolvedPath, $prefix)
                && ! str_starts_with($resolvedPath, "lumixy/providers/{$profile->id}/")) {
                // Foreign/unowned key — do not attempt remote delete.
                return true;
            }

            if (! $this->bunny->isConfigured()) {
                return true;
            }

            try {
                return $this->bunny->delete_file($resolvedPath);
            } catch (BunnyStorageException) {
                return false;
            }
        }

        if (! $url) {
            return true;
        }

        if (preg_match('/^https?:\/\//i', $url)) {
            return true;
        }

        return ! Storage::disk('public')->exists($url) || Storage::disk('public')->delete($url);
    }
}
