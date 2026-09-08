<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('auth_provider')->default('password')->after('password');
            $table->string('firebase_uid')->nullable()->unique()->after('auth_provider');
            $table->text('avatar_url')->nullable()->after('firebase_uid');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['firebase_uid']);
            $table->dropColumn(['auth_provider', 'firebase_uid', 'avatar_url']);
        });
    }
};
