<?php

namespace App\Services;

use App\Models\ProviderProfile;
use Illuminate\Support\Facades\Cache;

class AdminStatsCache
{
    public const STATS_KEY = 'admin:dashboard:stats:v2';
    public const SUMMARY_KEY = 'admin:notifications:summary:v1';
    public const TTL_SECONDS = 30;

    public static function rememberStats(callable $callback): array
    {
        return Cache::remember(self::STATS_KEY, self::TTL_SECONDS, $callback);
    }

    public static function rememberSummary(callable $callback): array
    {
        return Cache::remember(self::SUMMARY_KEY, self::TTL_SECONDS, $callback);
    }

    public static function flush(): void
    {
        Cache::forget(self::STATS_KEY);
        Cache::forget(self::SUMMARY_KEY);
    }
}
