<?php

use App\Http\Controllers\Api\BootstrapController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AppContactController;
use App\Http\Controllers\Api\AdminCityController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminNotificationController;
use App\Http\Controllers\Api\AdminPromotionController;
use App\Http\Controllers\Api\AdminProviderController;
use App\Http\Controllers\Api\AdminSubcategoryController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\BunnyTestController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProviderAuthController;
use App\Http\Controllers\Api\ProviderCloudinaryController;
use App\Http\Controllers\Api\ProviderGalleryController;
use App\Http\Controllers\Api\ProviderProfileController;
use App\Http\Controllers\Api\ProviderSubmissionController;
use App\Http\Controllers\Api\PublicProviderController;
use App\Http\Controllers\Api\PublicPromotionController;
use App\Http\Controllers\Api\UserNotificationController;
use App\Http\Controllers\Auth\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::pattern('id', '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}');

Route::get('/', function () {
    return response()->json([
        'message' => 'Lumixy API is running.',
        'health' => url('/api/test'),
        'admin_login' => url('/api/admin/auth/login'),
        'note' => 'Open the admin web UI separately (Vite), not this URL in the browser.',
    ]);
});

/*
|--------------------------------------------------------------------------
| Local Bunny Storage probe (temporary)
|--------------------------------------------------------------------------
*/
if (app()->environment('local')) {
    Route::middleware('throttle:api-write')->group(function () {
        Route::post('/bunny/upload', [BunnyTestController::class, 'upload']);
        Route::delete('/bunny/delete/{file_path}', [BunnyTestController::class, 'destroy'])
            ->where('file_path', '.*');
    });
}

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

Route::middleware('throttle:api-public')->group(function () {
    Route::get('/bootstrap', BootstrapController::class);
    Route::get('/service-categories', [PublicProviderController::class, 'categories']);
    Route::get('/cities', [PublicProviderController::class, 'cities']);
    Route::get('/cities/{id}/villages', [PublicProviderController::class, 'villages']);
    Route::get('/providers', [PublicProviderController::class, 'providers']);
    Route::get('/providers/featured', [PublicProviderController::class, 'featured']);
    Route::get('/providers/{id}', [PublicProviderController::class, 'show']);
    Route::get('/test', [HealthController::class, 'test']);
    Route::get('/admin/setup-status', [HealthController::class, 'adminSetupStatus']);
    Route::get('/app/contact', [AppContactController::class, 'show']);
    Route::get('/promotions', [PublicPromotionController::class, 'index']);
    Route::post('/promotions/{id}/click', [PublicPromotionController::class, 'click'])->middleware('throttle:api-write');
});

// Password Reset (OTP)
Route::middleware('throttle:api-auth')->group(function () {
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'sendOtp']);
    Route::post('/auth/verify-otp',      [PasswordResetController::class, 'verifyOtp']);
    Route::post('/auth/reset-password',  [PasswordResetController::class, 'resetPassword']);
});

/*
|--------------------------------------------------------------------------
| Google OAuth (Socialite) — mobile deep-link flow
|--------------------------------------------------------------------------
*/

Route::middleware('throttle:api-auth')->prefix('auth/google')->group(function () {
    Route::get('/redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('/callback', [GoogleAuthController::class, 'callback']);
    Route::post('/exchange', [GoogleAuthController::class, 'exchange']);
});

/*
|--------------------------------------------------------------------------
| Provider auth
|--------------------------------------------------------------------------
*/

Route::group(['middleware' => ['throttle:api-auth'], 'prefix' => 'provider/auth'], function () {
    Route::post('/register', [ProviderAuthController::class, 'register']);
    Route::post('/login', [ProviderAuthController::class, 'login']);
    Route::post('/google', [ProviderAuthController::class, 'google']);
});

Route::group(['middleware' => ['auth:sanctum', 'role:provider', 'throttle:api-user'], 'prefix' => 'provider'], function () {
    Route::post('/auth/logout', [ProviderAuthController::class, 'logout']);
    Route::get('/me', [ProviderAuthController::class, 'me']);

    // Profile Management
    Route::get('/profile', [ProviderProfileController::class, 'show']);
    Route::put('/profile/basic', [ProviderProfileController::class, 'updateBasic'])->middleware('throttle:api-write');
    Route::put('/profile/business', [ProviderProfileController::class, 'updateBusiness'])->middleware('throttle:api-write');
    Route::post('/profile/image', [ProviderProfileController::class, 'updateImage'])->middleware('throttle:api-write');
    Route::post('/profile/image/cloudinary', [ProviderCloudinaryController::class, 'saveProfileImage'])->middleware('throttle:api-write');
    Route::put('/profile/location', [ProviderProfileController::class, 'updateLocation'])->middleware('throttle:api-write');
    Route::put('/profile/contact', [ProviderProfileController::class, 'updateContact'])->middleware('throttle:api-write');
    Route::put('/profile/location-schedule', [ProviderProfileController::class, 'updateLocationSchedule'])->middleware('throttle:api-write');
    Route::get('/gallery', [ProviderGalleryController::class, 'index']);
    Route::post('/gallery', [ProviderGalleryController::class, 'store'])->middleware('throttle:api-write');
    Route::post('/gallery/cloudinary', [ProviderCloudinaryController::class, 'saveGalleryImage'])->middleware('throttle:api-write');
    Route::delete('/gallery/{id}', [ProviderGalleryController::class, 'destroy'])->middleware('throttle:api-write');

    Route::post('/submit', [ProviderSubmissionController::class, 'submit'])->middleware('throttle:api-write');
    Route::get('/application-status', [ProviderSubmissionController::class, 'status']);
});

Route::group(['middleware' => ['auth:sanctum', 'active', 'throttle:api-user'], 'prefix' => 'devices'], function () {
    Route::post('/register', [DeviceTokenController::class, 'register'])->middleware('throttle:api-write');
    Route::delete('/unregister', [DeviceTokenController::class, 'unregister'])->middleware('throttle:api-write');
    Route::post('/test-notification', [DeviceTokenController::class, 'test'])->middleware('throttle:api-write');
});

Route::group(['middleware' => ['auth:sanctum', 'active', 'throttle:api-user'], 'prefix' => 'notifications'], function () {
    Route::get('/', [UserNotificationController::class, 'index']);
    Route::delete('/', [UserNotificationController::class, 'clearAll'])->middleware(['throttle:api-write', 'idempotent']);
    Route::delete('/{id}', [UserNotificationController::class, 'destroy'])->middleware('throttle:api-write');
    Route::post('/{id}/read', [UserNotificationController::class, 'markRead'])->middleware('throttle:api-write');
});

/*
|--------------------------------------------------------------------------
| Admin auth
|--------------------------------------------------------------------------
*/

Route::group(['middleware' => ['throttle:api-auth'], 'prefix' => 'admin/auth'], function () {
    Route::post('/login', [AdminAuthController::class, 'login']);
});

Route::group(['middleware' => ['auth:sanctum', 'role:admin', 'throttle:api-user'], 'prefix' => 'admin'], function () {
    Route::post('/auth/logout', [AdminAuthController::class, 'logout']);
    Route::get('/me', [AdminAuthController::class, 'me']);
    Route::put('/auth/profile', [AdminAuthController::class, 'updateProfile'])->middleware('throttle:api-write');
    Route::get('/admins', [AdminAuthController::class, 'admins']);
    Route::post('/admins', [AdminAuthController::class, 'storeAdmin'])->middleware(['superadmin', 'throttle:api-write', 'idempotent']);
    Route::put('/admins/{id}', [AdminAuthController::class, 'updateAdmin'])->middleware('throttle:api-write');
    Route::delete('/admins/{id}', [AdminAuthController::class, 'destroyAdmin'])->middleware(['throttle:api-write', 'idempotent']);

    Route::get('/providers/pending', [AdminProviderController::class, 'pending']);
    Route::get('/providers', [AdminProviderController::class, 'index']);
    Route::get('/providers/{id}', [AdminProviderController::class, 'show']);
    Route::post('/providers/{id}/approve', [AdminProviderController::class, 'approve'])->middleware(['throttle:api-write', 'idempotent']);
    Route::post('/providers/{id}/reject', [AdminProviderController::class, 'reject'])->middleware(['throttle:api-write', 'idempotent']);
    Route::post('/providers/{id}/suspend', [AdminProviderController::class, 'suspend'])->middleware(['throttle:api-write', 'idempotent']);
    Route::put('/providers/{id}/subscription', [AdminProviderController::class, 'updateSubscription'])->middleware(['throttle:api-write', 'idempotent']);
    Route::post('/providers/{id}/subscription/renew', [AdminProviderController::class, 'renewSubscription'])->middleware(['throttle:api-write', 'idempotent']);
    Route::delete('/providers/{id}', [AdminProviderController::class, 'destroy'])->middleware(['throttle:api-write', 'idempotent']);
    
    Route::get('/categories', [AdminCategoryController::class, 'index']);
    Route::post('/categories', [AdminCategoryController::class, 'store'])->middleware('throttle:api-write');
    Route::put('/categories/{id}', [AdminCategoryController::class, 'update'])->middleware('throttle:api-write');
    Route::delete('/categories/{id}', [AdminCategoryController::class, 'destroy'])->middleware(['throttle:api-write', 'idempotent']);

    Route::get('/cities', [AdminCityController::class, 'index']);
    Route::post('/cities/sync-pcbs', [AdminCityController::class, 'syncFromPcbs'])->middleware(['superadmin', 'throttle:api-write', 'idempotent']);
    Route::post('/cities', [AdminCityController::class, 'store'])->middleware('throttle:api-write');
    Route::put('/cities/{id}', [AdminCityController::class, 'update'])->middleware('throttle:api-write');
    Route::delete('/cities/{id}', [AdminCityController::class, 'destroy'])->middleware(['throttle:api-write', 'idempotent']);

    Route::get('/subcategories', [AdminSubcategoryController::class, 'index']);
    Route::post('/subcategories', [AdminSubcategoryController::class, 'store'])->middleware('throttle:api-write');
    Route::put('/subcategories/{id}', [AdminSubcategoryController::class, 'update'])->middleware('throttle:api-write');
    Route::delete('/subcategories/{id}', [AdminSubcategoryController::class, 'destroy'])->middleware(['throttle:api-write', 'idempotent']);

    Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);

    Route::get('/notifications/summary', [AdminNotificationController::class, 'summary']);
    Route::post('/notifications/broadcast', [AdminNotificationController::class, 'broadcast'])->middleware(['throttle:api-write', 'idempotent']);

    Route::get('/app-contact', [AppContactController::class, 'showContactAdmin']);
    Route::put('/app-contact', [AppContactController::class, 'update'])->middleware('throttle:api-write');
    Route::get('/whatsapp-templates', [AppContactController::class, 'showWhatsAppTemplates']);
    Route::put('/whatsapp-templates', [AppContactController::class, 'updateWhatsAppTemplates'])->middleware('throttle:api-write');

    Route::get('/promotions', [AdminPromotionController::class, 'index']);
    Route::post('/promotions/media', [AdminPromotionController::class, 'uploadMedia'])->middleware('throttle:api-write');
    Route::post('/promotions/reorder', [AdminPromotionController::class, 'reorder'])->middleware('throttle:api-write');
    Route::post('/promotions', [AdminPromotionController::class, 'store'])->middleware('throttle:api-write');
    Route::post('/promotions/{id}/duplicate', [AdminPromotionController::class, 'duplicate'])->middleware(['throttle:api-write', 'idempotent']);
    Route::post('/promotions/{id}/toggle', [AdminPromotionController::class, 'toggle'])->middleware('throttle:api-write');
    Route::put('/promotions/{id}', [AdminPromotionController::class, 'update'])->middleware('throttle:api-write');
    Route::delete('/promotions/{id}', [AdminPromotionController::class, 'destroy'])->middleware(['throttle:api-write', 'idempotent']);
});
