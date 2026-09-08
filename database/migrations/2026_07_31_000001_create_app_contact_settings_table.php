<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_contact_settings', function (Blueprint $table) {
            $table->id();
            $table->string('whatsapp_number', 50);
            $table->string('phone_number', 50);
            $table->string('instagram_username', 255);
            $table->timestamps();
        });

        DB::table('app_contact_settings')->insert([
            'whatsapp_number' => '+970599000000',
            'phone_number' => '0599000000',
            'instagram_username' => 'lumixy.app',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('app_contact_settings');
    }
};
