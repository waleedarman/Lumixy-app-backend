<?php

use App\Models\ProviderProfile;
use App\Support\SubscriptionPeriod;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        ProviderProfile::query()
            ->whereNotNull('subscription_started_at')
            ->whereNotNull('subscription_ends_at')
            ->orderBy('id')
            ->chunkById(100, function ($profiles) {
                foreach ($profiles as $profile) {
                    $startAt = $profile->subscription_started_at?->copy()->startOfDay();
                    $endAt = $profile->subscription_ends_at?->copy();

                    if (! $startAt || ! $endAt) {
                        continue;
                    }

                    $maxAllowedEnd = SubscriptionPeriod::endFromStart($startAt);

                    if ($endAt->gt($maxAllowedEnd)) {
                        DB::table('provider_profiles')
                            ->where('id', $profile->id)
                            ->update([
                                'subscription_ends_at' => $maxAllowedEnd,
                                'updated_at' => now(),
                            ]);
                    }
                }
            });
    }

    public function down(): void
    {
        // Irreversible data correction.
    }
};
