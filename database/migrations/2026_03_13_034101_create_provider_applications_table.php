<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('provider_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('provider_profile_id');

            $table->enum('application_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestampTz('submitted_at')->useCurrent();
            $table->timestampTz('reviewed_at')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->text('notes')->nullable();

            $table->timestampsTz();

            $table->foreign('provider_profile_id')
                ->references('id')
                ->on('provider_profiles')
                ->cascadeOnDelete();

            $table->foreign('reviewed_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_applications');
    }
};