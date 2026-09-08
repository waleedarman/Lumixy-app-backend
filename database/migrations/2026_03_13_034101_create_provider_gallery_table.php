<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('provider_gallery', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('provider_profile_id');
            $table->text('image_url');
            $table->integer('sort_order')->default(0);
            $table->timestampTz('created_at')->useCurrent();

            $table->foreign('provider_profile_id')
                ->references('id')
                ->on('provider_profiles')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_gallery');
    }
};