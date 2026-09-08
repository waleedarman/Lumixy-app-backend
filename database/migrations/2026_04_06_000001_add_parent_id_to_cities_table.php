<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->uuid('parent_id')->nullable()->after('name');
        });

        Schema::table('cities', function (Blueprint $table) {
            $table->dropUnique('cities_name_unique');
            $table->foreign('parent_id', 'cities_parent_fk')
                ->references('id')
                ->on('cities')
                ->nullOnDelete();
            $table->index(['parent_id', 'sort_order'], 'cities_parent_sort_idx');
            $table->unique(['parent_id', 'name'], 'cities_parent_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->dropUnique('cities_parent_name_unique');
            $table->dropIndex('cities_parent_sort_idx');
            $table->dropForeign('cities_parent_fk');
            $table->dropColumn('parent_id');
            $table->unique('name');
        });
    }
};
