<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->text('image')->change();
            $table->text('mobile_image')->nullable()->change();
            $table->text('action_value')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            $table->string('image')->change();
            $table->string('mobile_image')->nullable()->change();
            $table->string('action_value')->nullable()->change();
        });
    }
};
