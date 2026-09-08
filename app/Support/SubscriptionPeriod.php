<?php

namespace App\Support;

use Carbon\Carbon;

class SubscriptionPeriod
{
    public static function expiringSoonDays(): int
    {
        return max(1, (int) config('lumixy.subscription_expiring_soon_days', 3));
    }

    public static function endFromStart(Carbon $startAt): Carbon
    {
        return $startAt->copy()->addMonthNoOverflow()->endOfDay();
    }

    public static function isExpired(?Carbon $endsAt): bool
    {
        if (! $endsAt instanceof Carbon) {
            return true;
        }

        return $endsAt->copy()->startOfDay()->lt(now()->startOfDay());
    }
}
