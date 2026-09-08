<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->index(['role', 'status'], 'users_role_status_idx');
        });

        Schema::table('service_categories', function (Blueprint $table) {
            $table->index(['is_active', 'sort_order', 'name'], 'sc_active_sort_name_idx');
        });

        Schema::table('cities', function (Blueprint $table) {
            $table->index(['is_active', 'parent_id', 'sort_order', 'name'], 'cities_active_parent_sort_name_idx');
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->index(['category_id', 'city_id'], 'pp_category_city_idx');
            $table->index(['subscription_ends_at', 'subscription_started_at'], 'pp_subscription_window_idx');
            $table->index(['created_at'], 'pp_created_at_idx');
        });

        Schema::table('provider_applications', function (Blueprint $table) {
            $table->index(['provider_profile_id', 'submitted_at'], 'pa_profile_submitted_idx');
            $table->index(['provider_profile_id', 'application_status', 'submitted_at'], 'pa_profile_status_submitted_idx');
            $table->index(['application_status', 'submitted_at'], 'pa_status_submitted_idx');
        });

        Schema::table('provider_gallery', function (Blueprint $table) {
            $table->index(['provider_profile_id', 'sort_order', 'created_at'], 'pg_profile_sort_created_idx');
        });

        Schema::table('user_notifications', function (Blueprint $table) {
            $table->index(['user_id', 'read_at', 'created_at'], 'un_user_read_created_idx');
        });
    }

    public function down(): void
    {
        Schema::table('user_notifications', function (Blueprint $table) {
            $table->dropIndex('un_user_read_created_idx');
        });

        Schema::table('provider_gallery', function (Blueprint $table) {
            $table->dropIndex('pg_profile_sort_created_idx');
        });

        Schema::table('provider_applications', function (Blueprint $table) {
            $table->dropIndex('pa_profile_submitted_idx');
            $table->dropIndex('pa_profile_status_submitted_idx');
            $table->dropIndex('pa_status_submitted_idx');
        });

        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropIndex('pp_category_city_idx');
            $table->dropIndex('pp_subscription_window_idx');
            $table->dropIndex('pp_created_at_idx');
        });

        Schema::table('cities', function (Blueprint $table) {
            $table->dropIndex('cities_active_parent_sort_name_idx');
        });

        Schema::table('service_categories', function (Blueprint $table) {
            $table->dropIndex('sc_active_sort_name_idx');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('users_role_status_idx');
        });
    }
};
