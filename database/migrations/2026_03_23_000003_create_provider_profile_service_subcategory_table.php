<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('provider_profile_service_subcategory', function (Blueprint $table) {
            $table->uuid('provider_profile_id');
            $table->uuid('service_subcategory_id');
            $table->timestampsTz();

            $table->primary(
                ['provider_profile_id', 'service_subcategory_id'],
                'ppss_pk'
            );

            $table->foreign('provider_profile_id', 'ppss_profile_fk')
                ->references('id')
                ->on('provider_profiles')
                ->cascadeOnDelete();

            $table->foreign('service_subcategory_id', 'ppss_subcat_fk')
                ->references('id')
                ->on('service_subcategories')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_profile_service_subcategory');
    }
};