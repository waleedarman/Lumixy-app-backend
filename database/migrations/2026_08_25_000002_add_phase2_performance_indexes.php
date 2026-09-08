<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indexes recommended by the Phase 1 scalability audit (create only if missing).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->index(
                ['is_active', 'display_order', 'created_at'],
                'promotions_active_order_created_idx'
            );
            $table->index(
                ['is_active', 'start_date', 'end_date'],
                'promotions_active_window_idx'
            );
        });

        Schema::table('provider_profile_service_subcategory', function (Blueprint $table) {
            // Existing PK is (provider_profile_id, service_subcategory_id).
            // Reverse-leading index helps whereHas(subServices) by subcategory.
            $table->index(
                ['service_subcategory_id', 'provider_profile_id'],
                'ppss_subcategory_profile_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->dropIndex('promotions_active_order_created_idx');
            $table->dropIndex('promotions_active_window_idx');
        });

        Schema::table('provider_profile_service_subcategory', function (Blueprint $table) {
            $table->dropIndex('ppss_subcategory_profile_idx');
        });
    }
};
