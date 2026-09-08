<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->string('profile_image_public_id')->nullable()->after('profile_image');
        });

        Schema::table('provider_gallery', function (Blueprint $table) {
            $table->string('public_id')->nullable()->after('image_url');
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropColumn('profile_image_public_id');
        });

        Schema::table('provider_gallery', function (Blueprint $table) {
            $table->dropColumn('public_id');
        });
    }
};
