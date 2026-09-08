<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (app()->environment('local')) {
        return response()->json([
            'message' => 'Lumixy Laravel backend is running.',
            'api' => url('/api'),
            'admin_web' => env('ADMIN_WEB_URL', 'http://127.0.0.1:5174'),
            'legacy_admin' => url('/admin'),
        ]);
    }

    return response()->json([
        'message' => 'API is running from web.php',
    ]);
});

Route::view('/admin/{any?}', 'admin')->where('any', '.*');
