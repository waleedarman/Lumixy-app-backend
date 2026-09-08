<?php

namespace App\Support;

/**
 * Gates local-only performance-test relaxations.
 * Never active unless APP_ENV=local and PERF_TEST_MODE=true.
 */
class LocalPerfTestMode
{
    public static function enabled(): bool
    {
        return app()->environment('local')
            && (bool) config('lumixy.perf_test_mode');
    }
}
