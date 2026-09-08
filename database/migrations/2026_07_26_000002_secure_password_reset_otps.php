<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('password_reset_otps', function (Blueprint $table) {
            $table->string('otp_hash', 64)->nullable()->after('otp');
            $table->unsignedTinyInteger('attempts')->default(0)->after('used');
        });

        DB::table('password_reset_otps')->delete();

        Schema::table('password_reset_otps', function (Blueprint $table) {
            $table->dropColumn('otp');
        });
    }

    public function down(): void
    {
        Schema::table('password_reset_otps', function (Blueprint $table) {
            $table->string('otp', 6)->nullable();
        });

        DB::table('password_reset_otps')->delete();

        Schema::table('password_reset_otps', function (Blueprint $table) {
            $table->dropColumn(['otp_hash', 'attempts']);
        });
    }
};
