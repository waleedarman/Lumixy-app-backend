<?php

namespace App\Console\Commands;

use App\Jobs\SendFirebasePushNotification;
use App\Support\PublicApiCache;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Read-only / non-destructive checks for staging Redis readiness.
 * Does not change business logic or API behavior.
 */
class VerifyStagingInfrastructure extends Command
{
    protected $signature = 'lumixy:verify-staging
                            {--dispatch-fcm-probe : Also dispatch a no-op Firebase push job (empty user list)}';

    protected $description = 'Verify Redis cache/session/queue/locks and Phase 1 PublicApiCache for staging';

    public function handle(): int
    {
        $ok = true;

        $this->info('Lumixy staging infrastructure check');
        $this->line('APP_ENV='.(string) config('app.env'));
        $this->newLine();

        $ok = $this->checkDrivers();

        $redisRequired = ! in_array((string) config('app.env'), ['local', 'testing'], true);

        if ($redisRequired) {
            $ok = $this->checkRedisPing() && $ok;
        } else {
            if (! $this->checkRedisPing(quietFailure: true)) {
                $this->warn('Redis unavailable — OK for local/testing with file|database drivers.');
            }
        }

        $ok = $this->checkCacheAndLocks() && $ok;
        $ok = $this->checkPublicApiCacheStampede() && $ok;
        $ok = $this->checkQueue() && $ok;

        if ($this->option('dispatch-fcm-probe')) {
            $ok = $this->dispatchFcmProbe() && $ok;
        }

        $this->newLine();
        if ($ok) {
            $this->info('All staging checks passed.');

            return self::SUCCESS;
        }

        $this->error('One or more staging checks failed. See above.');

        return self::FAILURE;
    }

    protected function checkDrivers(): bool
    {
        $cache = (string) config('cache.default');
        $session = (string) config('session.driver');
        $queue = (string) config('queue.default');
        $maintenance = (string) config('app.maintenance.driver');

        $this->table(
            ['Concern', 'Configured value', 'Staging target'],
            [
                ['CACHE_STORE', $cache, 'redis'],
                ['SESSION_DRIVER', $session, 'redis'],
                ['QUEUE_CONNECTION', $queue, 'redis'],
                ['APP_MAINTENANCE_DRIVER', $maintenance, 'cache (shared)'],
            ]
        );

        $pass = true;

        if (! in_array($cache, ['redis', 'redis_with_file_fallback'], true)) {
            $this->warn('CACHE_STORE is not redis*. Local fallback is OK; staging should use redis.');
            if ((string) config('app.env') !== 'local') {
                $pass = false;
            }
        }

        if (! in_array($session, ['redis', 'database', 'array'], true) && $session === 'file') {
            $this->warn('SESSION_DRIVER=file is not shared across app instances.');
            if ((string) config('app.env') !== 'local') {
                $pass = false;
            }
        }

        if (! in_array($queue, ['redis', 'redis_with_database_fallback'], true)) {
            $this->warn('QUEUE_CONNECTION is not redis*. Local database queue is OK; staging should use redis.');
            if ((string) config('app.env') !== 'local') {
                $pass = false;
            }
        }

        if ($maintenance === 'file' && (string) config('app.env') !== 'local') {
            $this->warn('APP_MAINTENANCE_DRIVER=file is per-node; prefer cache for multi-instance.');
        }

        return $pass;
    }

    protected function checkRedisPing(bool $quietFailure = false): bool
    {
        try {
            $pong = Redis::connection('default')->ping();
            $this->line('Redis default connection: OK ('.$this->stringify($pong).')');

            $cachePong = Redis::connection('cache')->ping();
            $this->line('Redis cache connection: OK ('.$this->stringify($cachePong).')');

            return true;
        } catch (Throwable $e) {
            if ($quietFailure) {
                $this->line('Redis ping skipped/failed: '.$e->getMessage());

                return false;
            }

            $this->error('Redis ping failed: '.$e->getMessage());
            $this->line('Install/start Redis, or keep local CACHE/SESSION/QUEUE on file|database.');

            return false;
        }
    }

    protected function checkCacheAndLocks(): bool
    {
        try {
            $key = 'lumixy:staging:cache-probe:'.uniqid('', true);
            Cache::put($key, 'ok', 30);
            $value = Cache::get($key);
            Cache::forget($key);

            if ($value !== 'ok') {
                $this->error('Cache put/get failed (unexpected value).');

                return false;
            }

            $this->line('Cache put/get: OK (store='.config('cache.default').')');

            $lock = Cache::lock('lumixy:staging:lock-probe', 5);
            if (! $lock->get()) {
                $this->error('Could not acquire cache lock.');

                return false;
            }
            $lock->release();
            $this->line('Cache lock acquire/release: OK');

            return true;
        } catch (Throwable $e) {
            $this->error('Cache/lock check failed: '.$e->getMessage());

            return false;
        }
    }

    protected function checkPublicApiCacheStampede(): bool
    {
        try {
            $calls = 0;
            $key = 'staging-stampede-'.uniqid('', true);

            $first = PublicApiCache::rememberLookup($key, function () use (&$calls) {
                $calls++;

                return ['built' => true, 'n' => $calls];
            }, 30);

            $second = PublicApiCache::rememberLookup($key, function () use (&$calls) {
                $calls++;

                return ['built' => true, 'n' => $calls];
            }, 30);

            PublicApiCache::flushLookups();

            if ($calls !== 1 || ($first['n'] ?? null) !== 1 || ($second['n'] ?? null) !== 1) {
                $this->error("PublicApiCache stampede check failed (builder ran {$calls} time(s)).");

                return false;
            }

            $this->line('PublicApiCache remember + lock path: OK (single builder call)');

            return true;
        } catch (Throwable $e) {
            $this->error('PublicApiCache check failed: '.$e->getMessage());

            return false;
        }
    }

    protected function checkQueue(): bool
    {
        try {
            $connection = (string) config('queue.default');
            $size = Queue::connection($connection)->size();
            $this->line("Queue connection '{$connection}' reachable (approx size={$size}).");
            $this->line('Worker command: php artisan queue:work redis --sleep=1 --tries=3');

            return true;
        } catch (Throwable $e) {
            $this->error('Queue check failed: '.$e->getMessage());

            return false;
        }
    }

    protected function dispatchFcmProbe(): bool
    {
        try {
            // Empty user list → job no-ops in handle(); proves Redis queue accepts FCM jobs.
            SendFirebasePushNotification::dispatch([], 'staging-probe', 'staging-probe', [
                'type' => 'general',
                'probe' => '1',
            ]);
            $this->line('Dispatched SendFirebasePushNotification probe (empty recipients).');
            $this->line('Run: php artisan queue:work redis --once');

            return true;
        } catch (Throwable $e) {
            $this->error('FCM probe dispatch failed: '.$e->getMessage());

            return false;
        }
    }

    protected function stringify(mixed $value): string
    {
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }

        if (is_scalar($value) || $value === null) {
            return (string) $value;
        }

        return get_debug_type($value);
    }
}
