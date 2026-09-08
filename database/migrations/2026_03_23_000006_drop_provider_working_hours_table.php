<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::dropIfExists('provider_working_hours');
    }

    public function down(): void
    {
        Schema::create('provider_working_hours', function ($table) {
            $table->uuid('id')->primary();
            $table->uuid('provider_profile_id');
            $table->enum('day_of_week', ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
            $table->time('start_time');
            $table->time('end_time');
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();
            $table->foreign('provider_profile_id')->references('id')->on('provider_profiles')->cascadeOnDelete();
            $table->unique(['provider_profile_id', 'day_of_week']);
        });
    }
};
