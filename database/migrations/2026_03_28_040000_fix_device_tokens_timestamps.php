<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }
        DB::statement('ALTER TABLE device_tokens ENGINE=InnoDB');
        DB::statement('ALTER TABLE device_tokens MODIFY created_at DATETIME NULL');
        DB::statement('ALTER TABLE device_tokens MODIFY updated_at DATETIME NULL');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }
        DB::statement('ALTER TABLE device_tokens MODIFY created_at TIMESTAMP NULL DEFAULT NULL');
        DB::statement('ALTER TABLE device_tokens MODIFY updated_at TIMESTAMP NULL DEFAULT NULL');
    }
};
