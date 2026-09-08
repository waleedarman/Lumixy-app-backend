<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Denormalized public visibility flag to avoid expensive whereHas(latestApplication)
 * on hot public catalog paths. Kept in sync by ProviderVisibilityService.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->boolean('is_publicly_visible')->default(false)->after('is_profile_completed');
            $table->index('is_publicly_visible', 'pp_is_publicly_visible_idx');
        });

        // Backfill: approved latest application + active user (subscription window still filtered in queries).
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            $profiles = DB::table('provider_profiles')->select('id', 'user_id')->get();
            foreach ($profiles as $profile) {
                $userActive = DB::table('users')
                    ->where('id', $profile->user_id)
                    ->where('status', 'active')
                    ->exists();

                if (! $userActive) {
                    continue;
                }

                $latest = DB::table('provider_applications')
                    ->where('provider_profile_id', $profile->id)
                    ->orderByDesc('submitted_at')
                    ->orderByDesc('id')
                    ->first();

                if ($latest && $latest->application_status === 'approved') {
                    DB::table('provider_profiles')
                        ->where('id', $profile->id)
                        ->update(['is_publicly_visible' => true]);
                }
            }

            return;
        }

        DB::statement("
            UPDATE provider_profiles pp
            INNER JOIN users u ON u.id = pp.user_id AND u.status = 'active'
            INNER JOIN (
                SELECT pa1.provider_profile_id, pa1.application_status
                FROM provider_applications pa1
                INNER JOIN (
                    SELECT provider_profile_id, MAX(submitted_at) AS max_submitted
                    FROM provider_applications
                    GROUP BY provider_profile_id
                ) latest ON latest.provider_profile_id = pa1.provider_profile_id
                    AND latest.max_submitted = pa1.submitted_at
            ) app ON app.provider_profile_id = pp.id AND app.application_status = 'approved'
            SET pp.is_publicly_visible = 1
        ");
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropIndex('pp_is_publicly_visible_idx');
            $table->dropColumn('is_publicly_visible');
        });
    }
};
