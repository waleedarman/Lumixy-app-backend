<?php

namespace App\Support;

class MediaUrl
{
    public static function publicAsset(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        $value = trim($value);

        if ($value === '') {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $value)) {
            $storageIndex = strpos($value, '/storage/');

            if ($storageIndex !== false && ! str_contains(strtolower($value), 'b-cdn.net')) {
                return url(substr($value, $storageIndex));
            }

            return $value;
        }

        return url('/storage/'.ltrim($value, '/'));
    }
}
