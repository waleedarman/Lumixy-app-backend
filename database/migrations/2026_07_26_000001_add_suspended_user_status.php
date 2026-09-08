<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active'");
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->string('status')->default('active')->change();
            });
        }
    }

    public function down(): void
    {
        DB::table('users')->where('status', 'suspended')->update(['status' => 'inactive']);
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
        }
    }
};
