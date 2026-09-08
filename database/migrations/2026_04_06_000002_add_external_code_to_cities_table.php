<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->string('external_code', 16)->nullable()->after('parent_id');
            $table->unique('external_code', 'cities_external_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('cities', function (Blueprint $table) {
            $table->dropUnique('cities_external_code_unique');
            $table->dropColumn('external_code');
        });
    }
};
