<?php

return [
    'public_lookup_cache_ttl' => env('LUMIXY_PUBLIC_LOOKUP_CACHE_TTL', 3600),
    'public_provider_cache_ttl' => env('LUMIXY_PUBLIC_PROVIDER_CACHE_TTL', 60),
    'max_gallery_images' => (int) env('LUMIXY_MAX_GALLERY_IMAGES', 30),
    'max_gallery_images_featured' => (int) env('LUMIXY_MAX_GALLERY_IMAGES_FEATURED', 40),
    'nearby_radius_km' => (float) env('LUMIXY_NEARBY_RADIUS_KM', 25),
    'subscription_expiring_soon_days' => (int) env('LUMIXY_SUBSCRIPTION_EXPIRING_SOON_DAYS', 3),
    // Auto-delete in-app notifications older than this many days.
    'notification_retention_days' => (int) env('LUMIXY_NOTIFICATION_RETENTION_DAYS', 7),
    // null keeps provider mobile sessions alive until explicit logout.
    'provider_token_lifetime_minutes' => env('LUMIXY_PROVIDER_TOKEN_LIFETIME_MINUTES'),

    /**
     * Local k6 only. Combined with APP_ENV=local, relaxes api-public IP throttle.
     * Must stay false in staging/production.
     */
    'perf_test_mode' => filter_var(env('PERF_TEST_MODE', false), FILTER_VALIDATE_BOOLEAN),
];
