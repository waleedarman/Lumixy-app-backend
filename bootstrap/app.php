<?php

use App\Http\Middleware\EnsureActiveAccount;
use App\Http\Middleware\EnsureRole;
use App\Http\Middleware\EnsureSuperAdmin;
use App\Http\Middleware\LimitApiRequestSize;
use App\Http\Middleware\RequireIdempotencyKey;
use App\Http\Middleware\SecurityHeaders;
use App\Models\IdempotencyKey;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('notifications:dispatch-subscription-alerts')->hourly();
        $schedule->command('notifications:purge-expired')->daily();
        $schedule->call(fn () => IdempotencyKey::where('expires_at', '<=', now())->delete())->daily();
    })
    ->withMiddleware(function ($middleware): void {
        $trustedProxies = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('TRUSTED_PROXIES', ''))
        )));

        if ($trustedProxies !== []) {
            $middleware->trustProxies(
                at: $trustedProxies,
                headers: Request::HEADER_X_FORWARDED_FOR
                    | Request::HEADER_X_FORWARDED_HOST
                    | Request::HEADER_X_FORWARDED_PORT
                    | Request::HEADER_X_FORWARDED_PROTO
            );
        }
        // Physical devices hit the API via LAN IPs (e.g. 192.168.x.x) during local dev.
        // Strict host checking would reject those requests with HTTP 400 "Bad request.".
        if (! in_array((string) env('APP_ENV', 'production'), ['local', 'testing'], true)) {
            $middleware->trustHosts(
                at: fn () => array_map(
                    fn (string $host) => '^'.preg_quote($host, '/').'$',
                    config('app.trusted_hosts', [])
                ),
                subdomains: false
            );
        }

        $middleware->append(SecurityHeaders::class);
        $middleware->append(LimitApiRequestSize::class);
        $middleware->alias([
            'role' => EnsureRole::class,
            'active' => EnsureActiveAccount::class,
            'superadmin' => EnsureSuperAdmin::class,
            'idempotent' => RequireIdempotencyKey::class,
        ]);

        // API-only app: never redirect unauthenticated guests to a missing web login route.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function ($exceptions): void {
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => $e->getMessage() ?: 'Unauthenticated.'], 401);
            }
        });
    })
    ->create();

return $app;
