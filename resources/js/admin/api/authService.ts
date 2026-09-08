import { apiRequest, setStoredToken } from './client';
import type { AdminAccount } from '../types';

export async function loginAdmin(email: string, password: string) {
  const response = await apiRequest<{
    token: string;
    user: AdminAccount;
    message: string;
  }>('/admin/auth/login', {
    method: 'POST',
    body: { email: email.toLowerCase().trim(), password },
  });

  setStoredToken(response.token);
  return response;
}

export async function logoutAdmin() {
  try {
    await apiRequest('/admin/auth/logout', { method: 'POST', auth: true });
  } finally {
    setStoredToken(null);
  }
}

export async function fetchCurrentAdmin() {
  return apiRequest<AdminAccount>('/admin/me', { auth: true });
}

export async function updateAdminProfile(payload: {
  full_name: string;
  email: string;
  current_password?: string;
  password?: string;
  password_confirmation?: string;
}) {
  const response = await apiRequest<{ user: AdminAccount; message: string }>('/admin/auth/profile', {
    method: 'PUT',
    auth: true,
    body: payload,
  });
  return response.user;
}
