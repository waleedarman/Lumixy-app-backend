<?php

namespace App\Services;

use App\Models\AppContactSetting;

class AppContactSettingService
{
    public function defaultActivationMessage(): string
    {
        return 'مرحباً، تم تفعيل حسابك على تطبيق Lumixy. يمكنك الآن الظهور للعملاء.';
    }

    public function defaultRenewalMessage(): string
    {
        return 'مرحباً، اشتراكك على تطبيق Lumixy على وشك الانتهاء. يرجى التواصل معنا لتجديد اشتراكك والاستمرار في الظهور للعملاء.';
    }

    public function defaults(): array
    {
        return [
            'whatsapp_number' => '+970599000000',
            'phone_number' => '0599000000',
            'instagram_username' => 'lumixy.app',
            'whatsapp_activation_message' => $this->defaultActivationMessage(),
            'whatsapp_renewal_message' => $this->defaultRenewalMessage(),
        ];
    }

    public function current(): AppContactSetting
    {
        $settings = AppContactSetting::query()->orderBy('id')->first();

        if ($settings) {
            return $settings;
        }

        return AppContactSetting::query()->create($this->defaults());
    }

    public function toPublicArray(?AppContactSetting $settings = null): array
    {
        $settings ??= $this->current();

        return [
            'whatsapp_number' => $settings->whatsapp_number,
            'phone_number' => $settings->phone_number,
            'instagram_username' => ltrim($settings->instagram_username, '@'),
        ];
    }

    public function toWhatsAppTemplatesArray(?AppContactSetting $settings = null): array
    {
        $settings ??= $this->current();

        return [
            'activation_message' => trim((string) ($settings->whatsapp_activation_message ?: $this->defaultActivationMessage())),
            'renewal_message' => trim((string) ($settings->whatsapp_renewal_message ?: $this->defaultRenewalMessage())),
        ];
    }
}
