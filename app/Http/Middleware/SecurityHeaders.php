<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /** Inline theme bootstrap in resources/views/admin.blade.php */
    private const ADMIN_THEME_SCRIPT_HASH = "'sha256-UK3mLScY1EmOk3JB+oyYsNmknmASQG5hHL6dD9V6XTs='";

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Content-Security-Policy', $this->contentSecurityPolicy($request));

        if ($request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    private function contentSecurityPolicy(Request $request): string
    {
        if ($request->is('admin', 'admin/*')) {
            $scriptSrc = ["'self'", self::ADMIN_THEME_SCRIPT_HASH];
            $connectSrc = ["'self'"];

            if (app()->environment('local')) {
                foreach ($this->viteDevOrigins() as $origin) {
                    $scriptSrc[] = $origin;
                    $connectSrc[] = $origin;
                    $connectSrc[] = preg_replace('#^http#', 'ws', $origin);
                }
            }

            return implode('; ', [
                "default-src 'self'",
                'script-src '.implode(' ', array_unique($scriptSrc)),
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com data:",
                'connect-src '.implode(' ', array_unique($connectSrc)),
                "img-src 'self' data: https: http:",
                "frame-ancestors 'none'",
                "base-uri 'self'",
            ]);
        }

        return "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
    }

    /**
     * @return list<string>
     */
    private function viteDevOrigins(): array
    {
        $origins = [
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://localhost:5173',
            'http://localhost:5174',
        ];

        $configured = env('VITE_DEV_SERVER_URL');
        if (is_string($configured) && $configured !== '') {
            $origins[] = rtrim($configured, '/');
        }

        return array_values(array_unique($origins));
    }
}
