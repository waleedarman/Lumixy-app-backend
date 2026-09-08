<?php

namespace App\Services;

use App\Models\ProviderProfile;
use App\Support\PublicApiCache;

class ProviderVisibilityService
{
    /**
     * Public catalog visibility excluding subscription date window
     * (dates remain filtered cheaply in queries).
     */
    public function computeIsPubliclyVisible(ProviderProfile $profile): bool
    {
        $profile->loadMissing(['user', 'latestApplication']);

        if (! $profile->user || $profile->user->status !== 'active') {
            return false;
        }

        $application = $profile->latestApplication;

        return $application !== null
            && $application->application_status === 'approved';
    }

    public function sync(ProviderProfile $profile, bool $flushPublicCache = true): bool
    {
        $visible = $this->computeIsPubliclyVisible($profile);

        if ((bool) $profile->is_publicly_visible === $visible) {
            return $visible;
        }

        $profile->forceFill([
            'is_publicly_visible' => $visible,
        ])->saveQuietly();

        if ($flushPublicCache) {
            PublicApiCache::flushProviders();
        }

        return $visible;
    }

    public function syncById(string $profileId, bool $flushPublicCache = true): void
    {
        $profile = ProviderProfile::query()->find($profileId);

        if ($profile) {
            $this->sync($profile, $flushPublicCache);
        }
    }

    public function backfillAll(): int
    {
        $updated = 0;

        ProviderProfile::query()
            ->with(['user', 'latestApplication'])
            ->orderBy('id')
            ->chunkById(200, function ($profiles) use (&$updated) {
                foreach ($profiles as $profile) {
                    $visible = $this->computeIsPubliclyVisible($profile);
                    if ((bool) $profile->is_publicly_visible !== $visible) {
                        $profile->forceFill(['is_publicly_visible' => $visible])->saveQuietly();
                        $updated++;
                    }
                }
            });

        if ($updated > 0) {
            PublicApiCache::flushProviders();
        }

        return $updated;
    }
}
