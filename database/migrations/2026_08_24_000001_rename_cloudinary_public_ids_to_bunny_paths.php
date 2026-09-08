<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('provider_profiles', 'profile_image_public_id')
                && ! Schema::hasColumn('provider_profiles', 'profile_image_path')) {
                $table->renameColumn('profile_image_public_id', 'profile_image_path');
            }
        });

        Schema::table('provider_gallery', function (Blueprint $table) {
            if (Schema::hasColumn('provider_gallery', 'public_id')
                && ! Schema::hasColumn('provider_gallery', 'image_path')) {
                $table->renameColumn('public_id', 'image_path');
            }
        });

        Schema::table('promotions', function (Blueprint $table) {
            if (Schema::hasColumn('promotions', 'image_public_id')
                && ! Schema::hasColumn('promotions', 'image_path')) {
                $table->renameColumn('image_public_id', 'image_path');
            }

            if (Schema::hasColumn('promotions', 'mobile_image_public_id')
                && ! Schema::hasColumn('promotions', 'mobile_image_path')) {
                $table->renameColumn('mobile_image_public_id', 'mobile_image_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('provider_profiles', 'profile_image_path')
                && ! Schema::hasColumn('provider_profiles', 'profile_image_public_id')) {
                $table->renameColumn('profile_image_path', 'profile_image_public_id');
            }
        });

        Schema::table('provider_gallery', function (Blueprint $table) {
            if (Schema::hasColumn('provider_gallery', 'image_path')
                && ! Schema::hasColumn('provider_gallery', 'public_id')) {
                $table->renameColumn('image_path', 'public_id');
            }
        });

        Schema::table('promotions', function (Blueprint $table) {
            if (Schema::hasColumn('promotions', 'image_path')
                && ! Schema::hasColumn('promotions', 'image_public_id')) {
                $table->renameColumn('image_path', 'image_public_id');
            }

            if (Schema::hasColumn('promotions', 'mobile_image_path')
                && ! Schema::hasColumn('promotions', 'mobile_image_public_id')) {
                $table->renameColumn('mobile_image_path', 'mobile_image_public_id');
            }
        });
    }
};
