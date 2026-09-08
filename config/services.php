<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'firebase' => [
        'project_id' => env('FIREBASE_PROJECT_ID'),
        'client_email' => env('FIREBASE_CLIENT_EMAIL'),
        'private_key' => env('FIREBASE_PRIVATE_KEY'),
        'api_key' => env('FIREBASE_API_KEY'),
        'verify_ssl' => env('FIREBASE_VERIFY_SSL', true),
        // Public HTTPS URL FCM can fetch for Android large icon / rich image.
        // Defaults to APP_URL/lumixy-logo.png when unset. Localhost URLs are skipped.
        'notification_image_url' => env('FIREBASE_NOTIFICATION_IMAGE_URL'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
        'deep_link' => env('FRONTEND_DEEP_LINK', 'lumixy://auth/google'),
    ],

    'pcbs' => [
        'verify_ssl' => filter_var(
            env('PCBS_VERIFY_SSL', env('APP_ENV') === 'production'),
            FILTER_VALIDATE_BOOL
        ),
    ],

];
