<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::table('personal_access_tokens')
            ->where('name', 'provider-token')
            ->update(['expires_at' => null]);
    }

    public function down(): void
    {
        // Previous expiry values are not recoverable.
    }
};
