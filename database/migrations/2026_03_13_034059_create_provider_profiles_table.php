<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('provider_profiles', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->string('provider_name')->nullable();
            $table->text('profile_image')->nullable();
            $table->text('bio')->nullable();
            $table->string('city')->nullable();
            $table->text('location_text')->nullable();
            $table->double('latitude')->nullable();
            $table->double('longitude')->nullable();
            $table->string('whatsapp_number')->nullable();
            $table->string('instagram_username')->nullable();
            $table->text('facebook_url')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('onboarding_step')->default(1);
            $table->boolean('is_profile_completed')->default(false);
            $table->timestampsTz();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_profiles');
    }
};