<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->uuid('category_id')->nullable()->after('bio');
            $table->json('custom_services')->nullable()->after('category_id');

            $table->foreign('category_id')
                ->references('id')
                ->on('service_categories')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('provider_profiles', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn(['category_id', 'custom_services']);
        });
    }
};