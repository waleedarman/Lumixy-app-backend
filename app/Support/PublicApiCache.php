<?php

namespace App\Support;

use Closure;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;

class PublicApiCache
{
    private const LOOKUPS_VERSION_KEY = 'public_api:lookups_version';
    private const PROVIDERS_VERSION_KEY = 'public_api:providers_version';

    public static function rememberLookup(string $key, Closure $callback, ?int $ttl = null): mixed
    {
        return self::rememberWithLock(
            self::key('lookups', self::LOOKUPS_VERSION_KEY, $key),
            $callback,
            $ttl ?? (int) config('lumixy.public_lookup_cache_ttl', 3600),
        );
    }

    public static function rememberProviders(string $key, Closure $callback, ?int $ttl = null): mixed
    {
        return self::rememberWithLock(
            self::key('providers', self::PROVIDERS_VERSION_KEY, $key),
            $callback,
            $ttl ?? (int) config('lumixy.public_provider_cache_ttl', 60),
        );
    }

    public static function flushLookups(): void
    {
        self::bump(self::LOOKUPS_VERSION_KEY);
    }

    public static function flushProviders(): void
    {
        self::bump(self::PROVIDERS_VERSION_KEY);
    }

    public static function flushAll(): void
    {
        self::flushLookups();
        self::flushProviders();
    }

    /**
     * Cache::remember alone does not prevent stampedes. Lock around expensive misses
     * so only one process rebuilds while others wait for the filled key.
     * Version-key invalidation behavior is unchanged.
     */
    private static function rememberWithLock(string $cacheKey, Closure $callback, int $ttl): mixed
    {
        $existing = Cache::get($cacheKey);
        if ($existing !== null) {
            return $existing;
        }

        $lock = Cache::lock('lock:'.$cacheKey, 15);

        try {
            return $lock->block(10, function () use ($cacheKey, $callback, $ttl) {
                $existing = Cache::get($cacheKey);
                if ($existing !== null) {
                    return $existing;
                }

                $value = $callback();
                Cache::put($cacheKey, $value, $ttl);

                return $value;
            });
        } catch (LockTimeoutException) {
            $existing = Cache::get($cacheKey);
            if ($existing !== null) {
                return $existing;
            }

            // Last resort: compute without holding the lock so the request still succeeds.
            $value = $callback();
            Cache::put($cacheKey, $value, $ttl);

            return $value;
        }
    }

    private static function key(string $namespace, string $versionKey, string $key): string
    {
        $version = Cache::rememberForever($versionKey, fn () => (string) now()->getTimestamp());

        return "public_api:{$namespace}:{$version}:{$key}";
    }

    private static function bump(string $versionKey): void
    {
        Cache::forever($versionKey, (string) now()->getPreciseTimestamp(3));
    }
}
