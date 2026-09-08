<?php

namespace App\Services;

use App\Jobs\SendFirebasePushNotification;
use App\Models\ProviderProfile;
use App\Models\User;
use App\Support\SubscriptionPeriod;
use Illuminate\Support\Collection;

class SubscriptionNotificationService
{
    public function dispatchDueNotifications(
        UserNotificationService $notifications
    ): array {
        $admins = $this->activeAdmins();
        $expiringSoon = $this->sendExpiringSoonReminderNotifications($notifications, $admins);
        $expired = $this->sendExpiredNotifications($notifications, $admins);

        return [
            'three_days' => $expiringSoon,
            'expiring_soon' => $expiringSoon,
            'expired' => $expired,
        ];
    }

    public function sendExpiringSoonReminderNotifications(
        UserNotificationService $notifications,
        ?Collection $admins = null
    ): int {
        $admins ??= $this->activeAdmins();
        $maxDays = SubscriptionPeriod::expiringSoonDays();
        $windowStart = now()->copy()->addDay()->startOfDay();
        $windowEnd = now()->copy()->addDays($maxDays)->endOfDay();

        $profiles = ProviderProfile::query()
            ->with('user')
            ->whereHas('user', function ($query) {
                $query->where('status', 'active');
            })
            ->whereNotNull('subscription_ends_at')
            ->where('subscription_ends_at', '>=', $windowStart)
            ->where('subscription_ends_at', '<=', $windowEnd)
            ->where(function ($query) {
                $query->whereNull('last_subscription_reminder_at')
                    ->orWhereDate('last_subscription_reminder_at', '!=', now()->toDateString());
            })
            ->get();

        $sent = 0;

        foreach ($profiles as $profile) {
            if (! $profile->user) {
                continue;
            }

            $remaining = $profile->subscription_days_remaining;
            if ($remaining === null || $remaining < 1 || $remaining > $maxDays) {
                continue;
            }

            $remainingLabel = $this->remainingDaysLabel($remaining);
            $providerMessage = "متبقي {$remainingLabel} لاشتراكك، جدد اشتراكك";
            $providerTitle = 'تنبيه الاشتراك';

            $notifications->createForUser(
                $profile->user,
                'renewal',
                $providerMessage,
                $providerTitle
            );

            SendFirebasePushNotification::dispatch(
                [(string) $profile->user->id],
                $providerTitle,
                $providerMessage,
                [
                    'type' => 'renewal',
                    'title' => $providerTitle,
                    'body' => $providerMessage,
                    'provider_id' => (string) $profile->id,
                    'days_remaining' => (string) $remaining,
                ]
            );

            $providerName = $this->providerDisplayName($profile);
            $adminMessage = "اشتراك المزود {$providerName} ينتهي خلال {$remainingLabel}";
            $this->notifyAdmins(
                $profile,
                $notifications,
                $admins,
                $providerTitle,
                $adminMessage
            );

            $profile->forceFill([
                'last_subscription_reminder_at' => now(),
            ])->save();
            $sent++;
        }

        return $sent;
    }

    public function sendThreeDaysReminderNotifications(
        UserNotificationService $notifications,
        ?Collection $admins = null
    ): int {
        return $this->sendExpiringSoonReminderNotifications($notifications, $admins);
    }

    public function sendExpiredNotifications(
        UserNotificationService $notifications,
        ?Collection $admins = null
    ): int {
        $admins ??= $this->activeAdmins();
        $today = now()->toDateString();

        $profiles = ProviderProfile::query()
            ->with('user')
            ->whereHas('user', function ($query) {
                $query->where('status', 'active');
            })
            ->whereNotNull('subscription_ends_at')
            ->whereDate('subscription_ends_at', '<=', $today)
            ->where(function ($query) {
                $query->whereNull('subscription_expired_notified_at')
                    ->orWhereDate('subscription_expired_notified_at', '!=', now()->toDateString());
            })
            ->get();

        foreach ($profiles as $profile) {
            if (! $profile->user) {
                continue;
            }

            $providerTitle = 'انتهاء الاشتراك';
            $providerMessage = 'انتهى اشتراكك، أنت غير ظاهر للعملاء حتى يتم التجديد';

            $notifications->createForUser(
                $profile->user,
                'renewal',
                $providerMessage,
                $providerTitle
            );

            SendFirebasePushNotification::dispatch(
                [(string) $profile->user->id],
                $providerTitle,
                $providerMessage,
                [
                    'type' => 'renewal',
                    'title' => $providerTitle,
                    'body' => $providerMessage,
                    'provider_id' => (string) $profile->id,
                ]
            );

            $providerName = $this->providerDisplayName($profile);
            $this->notifyAdmins(
                $profile,
                $notifications,
                $admins,
                $providerTitle,
                "انتهى اشتراك المزود {$providerName}"
            );

            $profile->forceFill([
                'subscription_expired_notified_at' => now(),
            ])->save();
        }

        return $profiles->count();
    }

    protected function activeAdmins(): Collection
    {
        return User::query()
            ->with('deviceTokens')
            ->where('role', 'admin')
            ->where('status', 'active')
            ->get();
    }

    protected function providerDisplayName(ProviderProfile $profile): string
    {
        $name = trim((string) ($profile->provider_name ?: $profile->user?->full_name ?: ''));

        return $name !== '' ? $name : 'مزود';
    }

    protected function remainingDaysLabel(int $days): string
    {
        return match ($days) {
            1 => 'يوم',
            2 => 'يومان',
            default => "{$days} أيام",
        };
    }

    protected function notifyAdmins(
        ProviderProfile $profile,
        UserNotificationService $notifications,
        Collection $admins,
        string $title,
        string $message
    ): void {
        if ($admins->isEmpty()) {
            return;
        }

        // Avoid duplicate unread admin rows for the same message within a short window.
        $freshAdmins = $admins->filter(function (User $admin) use ($message) {
            return ! $admin->notifications()
                ->where('message', $message)
                ->where('created_at', '>=', now()->subHours(20))
                ->exists();
        })->values();

        if ($freshAdmins->isNotEmpty()) {
            $notifications->createForUsers(
                $freshAdmins,
                'renewal',
                $message,
                $title
            );
        }

        $adminIds = $admins
            ->filter(fn (User $user) => $user->deviceTokens->isNotEmpty())
            ->pluck('id')
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        if ($adminIds === []) {
            return;
        }

        SendFirebasePushNotification::dispatch(
            $adminIds,
            $title,
            $message,
            [
                'type' => 'renewal',
                'title' => $title,
                'body' => $message,
                'provider_id' => (string) $profile->id,
            ]
        );
    }
}
