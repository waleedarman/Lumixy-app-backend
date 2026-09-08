<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->uuid('city_id')->nullable()->after('category_id');
            $table->string('subscription_type')->default('standard')->after('is_featured');
            $table->timestampTz('subscription_started_at')->nullable()->after('subscription_type');
            $table->timestampTz('subscription_ends_at')->nullable()->after('subscription_started_at');

            $table->foreign('city_id', 'pp_city_fk')
                ->references('id')
                ->on('cities')
                ->nullOnDelete();

            $table->index(['city_id', 'category_id'], 'pp_city_cat_idx');
            $table->index(
                ['is_featured', 'subscription_started_at', 'subscription_ends_at'],
                'pp_feat_sub_dates_idx'
            );
        });

        $profiles = DB::table('provider_profiles')
            ->select('id', 'city', 'category_id', 'custom_services', 'is_featured', 'created_at')
            ->get();

        $cityIds = [];

        foreach ($profiles as $profile) {
            $cityName = trim((string) ($profile->city ?? ''));

            if ($cityName === '') {
                continue;
            }

            if (!isset($cityIds[$cityName])) {
                $existingCityId = DB::table('cities')->where('name', $cityName)->value('id');

                if (!$existingCityId) {
                    $existingCityId = (string) Str::uuid();

                    DB::table('cities')->insert([
                        'id' => $existingCityId,
                        'name' => $cityName,
                        'is_active' => true,
                        'sort_order' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $cityIds[$cityName] = $existingCityId;
            }

            DB::table('provider_profiles')
                ->where('id', $profile->id)
                ->update([
                    'city_id' => $cityIds[$cityName],
                ]);
        }

        foreach ($profiles as $profile) {
            $services = json_decode($profile->custom_services ?? '[]', true);

            if (!$profile->category_id || !is_array($services)) {
                continue;
            }

            foreach ($services as $serviceName) {
                $serviceName = trim((string) $serviceName);

                if ($serviceName === '') {
                    continue;
                }

                $subcategoryId = DB::table('service_subcategories')
                    ->where('service_category_id', $profile->category_id)
                    ->where('name', $serviceName)
                    ->value('id');

                if (!$subcategoryId) {
                    $subcategoryId = (string) Str::uuid();

                    DB::table('service_subcategories')->insert([
                        'id' => $subcategoryId,
                        'service_category_id' => $profile->category_id,
                        'name' => $serviceName,
                        'is_active' => true,
                        'sort_order' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                DB::table('provider_profile_service_subcategory')->updateOrInsert(
                    [
                        'provider_profile_id' => $profile->id,
                        'service_subcategory_id' => $subcategoryId,
                    ],
                    [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            if ($profile->is_featured) {
                DB::table('provider_profiles')
                    ->where('id', $profile->id)
                    ->update([
                        'subscription_type' => 'featured',
                        'subscription_started_at' => $profile->created_at ?? now(),
                    ]);
            }
        }

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn(['city', 'custom_services']);
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->string('city')->nullable()->after('bio');
            $table->json('custom_services')->nullable()->after('city_id');
        });

        $profiles = DB::table('provider_profiles')
            ->select('id', 'city_id')
            ->get();

        foreach ($profiles as $profile) {
            $cityName = null;

            if ($profile->city_id) {
                $cityName = DB::table('cities')->where('id', $profile->city_id)->value('name');
            }

            $services = DB::table('provider_profile_service_subcategory as pivot')
                ->join('service_subcategories as subcategories', 'subcategories.id', '=', 'pivot.service_subcategory_id')
                ->where('pivot.provider_profile_id', $profile->id)
                ->pluck('subcategories.name')
                ->toArray();

            DB::table('provider_profiles')
                ->where('id', $profile->id)
                ->update([
                    'city' => $cityName,
                    'custom_services' => json_encode($services),
                ]);
        }

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropForeign('pp_city_fk');
            $table->dropIndex('pp_city_cat_idx');
            $table->dropIndex('pp_feat_sub_dates_idx');
            $table->dropColumn([
                'city_id',
                'subscription_type',
                'subscription_started_at',
                'subscription_ends_at',
            ]);
        });
    }
};