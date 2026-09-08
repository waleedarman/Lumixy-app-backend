<?php

namespace App\Support;

class ProviderAvatar
{
    public static function placeholderUrl(string $name): string
    {
        $query = http_build_query([
            'name' => $name,
            'background' => '6366f1',
            'color' => 'ffffff',
            'size' => '256',
            'bold' => 'true',
        ]);

        return 'https://ui-avatars.com/api/?'.$query;
    }
}
