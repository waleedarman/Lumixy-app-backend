<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_contact_settings', function (Blueprint $table) {
            $table->text('whatsapp_activation_message')->nullable()->after('instagram_username');
            $table->text('whatsapp_renewal_message')->nullable()->after('whatsapp_activation_message');
        });

        DB::table('app_contact_settings')->update([
            'whatsapp_activation_message' => 'مرحباً، تم تفعيل حسابك على تطبيق Lumixy. يمكنك الآن الظهور للعملاء.',
            'whatsapp_renewal_message' => 'مرحباً، اشتراكك على تطبيق Lumixy على وشك الانتهاء. يرجى التواصل معنا لتجديد اشتراكك والاستمرار في الظهور للعملاء.',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::table('app_contact_settings', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_activation_message', 'whatsapp_renewal_message']);
        });
    }
};
