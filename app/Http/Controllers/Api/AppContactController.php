<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AppContactSettingService;
use App\Support\PublicApiCache;
use Illuminate\Http\Request;

class AppContactController extends Controller
{
    public function __construct(
        protected AppContactSettingService $contactSettings
    ) {
    }

    public function show()
    {
        return response()->json(PublicApiCache::rememberLookup(
            'app_contact',
            fn () => $this->contactSettings->toPublicArray(),
            300
        ));
    }

    public function showContactAdmin()
    {
        return response()->json($this->contactSettings->toPublicArray());
    }

    public function showWhatsAppTemplates()
    {
        return response()->json($this->contactSettings->toWhatsAppTemplatesArray());
    }

    public function updateWhatsAppTemplates(Request $request)
    {
        $data = $request->validate([
            'activation_message' => ['required', 'string', 'min:10', 'max:1000'],
            'renewal_message' => ['required', 'string', 'min:10', 'max:1000'],
        ], [
            'activation_message.required' => 'رسالة تفعيل الحساب مطلوبة.',
            'activation_message.min' => 'رسالة تفعيل الحساب قصيرة جداً.',
            'renewal_message.required' => 'رسالة تجديد الاشتراك مطلوبة.',
            'renewal_message.min' => 'رسالة تجديد الاشتراك قصيرة جداً.',
        ]);

        $settings = $this->contactSettings->current();
        $settings->update([
            'whatsapp_activation_message' => trim($data['activation_message']),
            'whatsapp_renewal_message' => trim($data['renewal_message']),
        ]);

        return response()->json([
            'message' => 'تم تحديث رسائل واتساب.',
            'whatsapp_templates' => $this->contactSettings->toWhatsAppTemplatesArray($settings->fresh()),
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'whatsapp_number' => ['required', 'string', 'max:50', 'regex:/^\+?[0-9]{8,15}$/'],
            'phone_number' => ['required', 'string', 'max:50', 'regex:/^[0-9+\-\s()]{6,20}$/'],
            'instagram_username' => ['required', 'string', 'max:255', 'regex:/^[A-Za-z0-9._]{2,30}$/'],
        ], [
            'whatsapp_number.required' => 'رقم واتساب مطلوب.',
            'whatsapp_number.regex' => 'صيغة رقم واتساب غير صحيحة. استخدم رمز الدولة، مثل +970599000000.',
            'phone_number.required' => 'رقم الهاتف مطلوب.',
            'phone_number.regex' => 'صيغة رقم الهاتف غير صحيحة.',
            'instagram_username.required' => 'اسم مستخدم انستغرام مطلوب.',
            'instagram_username.regex' => 'اسم مستخدم انستغرام غير صحيح. استخدم حروفاً وأرقاماً ونقطة أو _ فقط.',
        ]);

        $settings = $this->contactSettings->current();
        $settings->update([
            'whatsapp_number' => $this->normalizeWhatsapp($data['whatsapp_number']),
            'phone_number' => trim($data['phone_number']),
            'instagram_username' => ltrim(trim($data['instagram_username']), '@'),
        ]);

        PublicApiCache::flushLookups();

        return response()->json([
            'message' => 'تم تحديث معلومات التواصل.',
            'contact' => $this->contactSettings->toPublicArray($settings->fresh()),
        ]);
    }

    protected function normalizeWhatsapp(string $value): string
    {
        $normalized = preg_replace('/\s+/', '', trim($value)) ?? '';

        if (! str_starts_with($normalized, '+')) {
            $normalized = '+'.$normalized;
        }

        return $normalized;
    }
}
