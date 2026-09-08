import { apiRequest } from './client';

export type AppContactSettings = {
  whatsapp_number: string;
  phone_number: string;
  instagram_username: string;
};

export const DEFAULT_APP_CONTACT_SETTINGS: AppContactSettings = {
  whatsapp_number: '+970599000000',
  phone_number: '0599000000',
  instagram_username: 'lumixy.app',
};

export async function fetchAppContactSettings() {
  return apiRequest<AppContactSettings>('/admin/app-contact', { auth: true });
}

export async function updateAppContactSettings(payload: AppContactSettings) {
  const response = await apiRequest<{ message: string; contact: AppContactSettings }>('/admin/app-contact', {
    method: 'PUT',
    auth: true,
    body: payload,
  });

  return response.contact;
}
