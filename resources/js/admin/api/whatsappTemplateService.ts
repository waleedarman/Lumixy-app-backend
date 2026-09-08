import { apiRequest } from './client';

export type WhatsAppTemplates = {
  activation_message: string;
  renewal_message: string;
};

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplates = {
  activation_message: 'مرحباً، تم تفعيل حسابك على تطبيق Lumixy. يمكنك الآن الظهور للعملاء.',
  renewal_message:
    'مرحباً، اشتراكك على تطبيق Lumixy على وشك الانتهاء. يرجى التواصل معنا لتجديد اشتراكك والاستمرار في الظهور للعملاء.',
};

export async function fetchWhatsAppTemplates() {
  return apiRequest<WhatsAppTemplates>('/admin/whatsapp-templates', { auth: true });
}

export async function updateWhatsAppTemplates(payload: WhatsAppTemplates) {
  const response = await apiRequest<{ message: string; whatsapp_templates: WhatsAppTemplates }>(
    '/admin/whatsapp-templates',
    {
      method: 'PUT',
      auth: true,
      body: payload,
    },
  );

  return response.whatsapp_templates;
}
