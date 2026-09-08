<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('service_subcategories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('service_category_id');
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestampsTz();

            $table->foreign('service_category_id')
                ->references('id')
                ->on('service_categories')
                ->cascadeOnDelete();

            $table->unique(['service_category_id', 'name'], 'ssc_cat_name_uniq');

            $table->index(
                ['service_category_id', 'is_active', 'sort_order'],
                'ssc_cat_active_sort_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_subcategories');
    }
};