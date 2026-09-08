<?php

use App\Models\User;
use App\Services\PcbsCitySyncService;
use App\Services\SubscriptionNotificationService;
use App\Services\UserNotificationService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

Artisan::command('admin:create {email} {--name=Super Admin} {--password=} {--super}', function () {
    $email = mb_strtolower(trim((string) $this->argument('email')));
    $name = trim((string) $this->option('name'));
    $password = (string) ($this->option('password') ?: Str::password(16));

    if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $this->error('Invalid email address.');

        return 1;
    }

    if (User::where('email', $email)->exists()) {
        $this->error('A user with this email already exists.');

        return 1;
    }

    $passwordRule = Password::defaults();
    $validator = validator(
        ['password' => $password],
        ['password' => ['required', 'string', $passwordRule]]
    );

    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $message) {
            $this->error($message);
        }

        return 1;
    }

    $admin = new User([
        'full_name' => $name,
        'email' => $email,
        'password' => Hash::make($password),
    ]);
    $admin->forceFill([
        'role' => 'admin',
        'status' => 'active',
        'is_super_admin' => $this->option('super') || ! User::where('role', 'admin')->exists(),
    ])->save();

    $this->info('Admin account created successfully.');
    $this->line('Email: '.$email);
    $this->line('Password: '.$password);
    $this->comment('Use these credentials on the web admin login and mobile admin login.');

    return 0;
})->purpose('Create an active admin account for local or first-time setup');

Artisan::command('cities:sync-pcbs', function (PcbsCitySyncService $service) {
    $result = $service->sync();

    $this->info('PCBS/ArcGIS city sync completed.');
    $this->info('Governorates: ' . $result['total_governorates']);
    $this->info('Localities from API: ' . $result['total_localities']);
    $this->info('Parents created: ' . $result['parents_created']);
    $this->info('Parents updated: ' . $result['parents_updated']);
    $this->info('Localities created: ' . $result['localities_created']);
    $this->info('Localities updated: ' . $result['localities_updated']);
})->purpose('Sync governorates and all localities from official PCBS ArcGIS API');

Artisan::command('notifications:dispatch-subscription-alerts', function (
    SubscriptionNotificationService $subscriptionNotifications,
    UserNotificationService $notifications
) {
    $result = $subscriptionNotifications->dispatchDueNotifications($notifications);

    $this->info('Expiring-soon reminders sent: ' . ($result['expiring_soon'] ?? $result['three_days']));
    $this->info('Expired notifications sent: ' . $result['expired']);
})->purpose('Dispatch provider subscription reminders and expiry notifications');

Artisan::command('notifications:purge-expired', function (UserNotificationService $notifications) {
    $deleted = $notifications->purgeExpired();
    $days = $notifications->retentionDays();

    $this->info("Purged {$deleted} notification(s) older than {$days} day(s).");
})->purpose('Delete in-app notifications older than the configured retention window');

Artisan::command('providers:seed {count=20} {--password=LumixyProvider123!}', function () {
    $count = max(1, min(100, (int) $this->argument('count')));
    $password = (string) $this->option('password');

    if (strlen($password) < 8) {
        $this->error('Password must be at least 8 characters.');

        return 1;
    }

    $seeder = app(\Database\Seeders\ProviderDemoSeeder::class);
    $seeder->setCommand($this);
    $seeder->run($count, $password);

    return 0;
})->purpose('Seed demo provider accounts with categories and cities');

Artisan::command('providers:backfill-avatars', function () {
    $updated = 0;

    \App\Models\ProviderProfile::query()
        ->where(function ($query) {
            $query->whereNull('profile_image')->orWhere('profile_image', '');
        })
        ->whereHas('user', function ($query) {
            $query->where('email', 'like', '%@lumixy.test');
        })
        ->orderBy('created_at')
        ->each(function (\App\Models\ProviderProfile $profile) use (&$updated) {
            $name = $profile->provider_name ?: 'Provider';

            $profile->forceFill([
                'profile_image' => \App\Support\ProviderAvatar::placeholderUrl($name),
            ])->save();

            $updated++;
        });

    \App\Support\PublicApiCache::flushProviders();

    $this->info("Updated {$updated} demo provider avatar(s).");

    return 0;
})->purpose('Assign placeholder avatar URLs to demo providers missing a profile image');

Artisan::command('providers:clear-placeholder-avatars', function () {
    $cleared = \App\Models\ProviderProfile::query()
        ->where('profile_image', 'like', '%ui-avatars.com%')
        ->whereHas('user', function ($query) {
            $query->where('email', 'not like', '%@lumixy.test');
        })
        ->update(['profile_image' => null]);

    \App\Support\PublicApiCache::flushProviders();

    $this->info("Cleared {$cleared} placeholder avatar(s) from real provider accounts.");

    return 0;
})->purpose('Remove demo placeholder avatars from real (non-demo) provider accounts');
