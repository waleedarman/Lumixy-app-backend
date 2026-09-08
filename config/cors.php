<?php

$localOrigins = env('APP_ENV', 'production') === 'local'
    ? [
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://127.0.0.1:5175',
        'http://127.0.0.1:5176',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://127.0.0.1:4173',
        'http://localhost:4173',
    ]
    : [];

$localOriginPatterns = env('APP_ENV', 'production') === 'local'
    ? [
        '#^https?://(127\.0\.0\.1|localhost):51[0-9]{2}$#',
        '#^https?://(127\.0\.0\.1|localhost):4173$#',
    ]
    : [];

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        $localOrigins,
        array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')))
    )))),
    'allowed_origins_patterns' => array_values(array_unique(array_filter(array_merge(
        $localOriginPatterns,
        array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', '')))
    )))),
    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Idempotency-Key', 'X-Request-ID', 'X-Requested-With'],
    'exposed_headers' => ['Idempotency-Replayed', 'Retry-After', 'X-Request-ID'],
    'max_age' => 600,
    'supports_credentials' => false,
];
