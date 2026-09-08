<?php

namespace App\Providers;

use App\Support\LocalPerfTestMode;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);
        Model::preventSilentlyDiscardingAttributes($this->app->isLocal());

        Password::defaults(function () {
            $rule = Password::min(12)
                ->mixedCase()
                ->numbers()
                ->symbols();

            return $this->app->isProduction()
                ? $rule->uncompromised()
                : $rule;
        });

        RateLimiter::for('api-public', function (Request $request) {
            // Local k6 only: single-IP traffic from 127.0.0.1 would otherwise hit product throttle.
            // Requires APP_ENV=local AND PERF_TEST_MODE=true. Auth/write/user limiters unchanged.
            if (LocalPerfTestMode::enabled()) {
                return Limit::none();
            }

            return [
                Limit::perMinute(600)->by($request->ip()),
                Limit::perSecond(30)->by($request->ip()),
            ];
        });

        RateLimiter::for('api-auth', function (Request $request) {
            $identity = mb_strtolower(trim((string) $request->input('email')));
            $pairKey = hash('sha256', $request->ip().'|'.$identity);

            if ($this->app->environment('local')) {
                return [
                    Limit::perMinute(120)->by($request->ip()),
                    Limit::perMinute(60)->by($identity !== '' ? $pairKey : $request->ip()),
                ];
            }

            return [
                Limit::perMinute(10)->by($request->ip()),
                Limit::perMinute(5)->by($identity !== '' ? $pairKey : $request->ip()),
            ];
        });

        RateLimiter::for('api-user', function (Request $request) {
            $key = $request->user()?->id ?: $request->ip();

            return [
                Limit::perMinute(300)->by($key),
                Limit::perSecond(20)->by($key),
            ];
        });

        RateLimiter::for('api-write', function (Request $request) {
            $key = $request->user()?->id ?: $request->ip();

            return [
                Limit::perMinute(60)->by($key),
                Limit::perSecond(5)->by($key),
            ];
        });
    }
}
