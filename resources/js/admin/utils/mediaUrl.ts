import { getApiBaseUrl } from '../api/client';

export function isRemoteCdnUrl(value?: string | null): boolean {
  if (!value) return false;
  return /res\.cloudinary\.com|b-cdn\.net/i.test(value) || /^https:\/\//i.test(value);
}

/** @deprecated Use isRemoteCdnUrl */
export function isCloudinaryUrl(value?: string | null): boolean {
  return isRemoteCdnUrl(value);
}

export function getPublicBaseUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const apiBase = getApiBaseUrl().replace(/\/api\/?$/i, '');

  if (apiBase) {
    return apiBase;
  }

  return typeof window === 'undefined' ? '' : window.location.origin;
}

export function resolveMediaUrl(value?: string | null): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const trimmed = value.trim();

  if (/^(data:|blob:)/i.test(trimmed)) {
    return trimmed;
  }

  if (isRemoteCdnUrl(trimmed) || /^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const publicBase = getPublicBaseUrl();
  const storageIndex = trimmed.indexOf('/storage/');

  if (storageIndex >= 0) {
    return `${publicBase}${trimmed.slice(storageIndex)}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `${publicBase}/storage/${trimmed.replace(/^\/+/, '')}`;
}
