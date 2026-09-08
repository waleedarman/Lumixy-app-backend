<?php

return [
    'storage_zone' => env('BUNNY_STORAGE_ZONE'),
    'storage_api_key' => env('BUNNY_STORAGE_API_KEY'),
    'storage_host' => env('BUNNY_STORAGE_HOST', 'storage.bunnycdn.com'),
    'cdn_url' => env('BUNNY_CDN_URL'),
    // Local WAMP often lacks CA roots; keep true in production.
    'verify_ssl' => env('BUNNY_VERIFY_SSL', true),
];
