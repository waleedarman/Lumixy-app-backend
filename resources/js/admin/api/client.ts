const TOKEN_KEY = 'lumixy_admin_token';

export class ApiError extends Error {
  status: number;
  details: unknown;
  retryAfterSeconds: number | null;

  constructor(message: string, status = 0, details: unknown = null, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function getApiBaseUrl(): string {
  const meta = document.querySelector('meta[name="api-base-url"]');
  const configured = meta?.getAttribute('content')?.trim();

  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  return `${window.location.origin}/api`;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

function createRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function toQueryString(query?: Record<string, string | number | boolean | null | undefined>) {
  if (!query) {
    return '';
  }

  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    search.append(key, String(value));
  }

  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function extractApiMessage(payload: unknown, status: number): string {
  if (!payload || typeof payload !== 'object') {
    return `Request failed with status ${status}`;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.message === 'string') {
    return record.message;
  }

  if (typeof record.error === 'string') {
    return record.error;
  }

  if (record.errors && typeof record.errors === 'object') {
    const first = Object.values(record.errors as Record<string, unknown>)
      .flat()
      .find(Boolean);

    if (typeof first === 'string') {
      return first;
    }
  }

  return `Request failed with status ${status}`;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown> | FormData;
    auth?: boolean;
    idempotent?: boolean;
    headers?: Record<string, string>;
    query?: Record<string, string | number | boolean | null | undefined>;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Request-ID': createRequestId(),
    ...(options.headers || {}),
  };

  if (options.auth) {
    const token = getStoredToken();

    if (!token) {
      throw new ApiError('Authentication required.', 401);
    }

    headers.Authorization = `Bearer ${token}`;
  }

  if (options.idempotent) {
    headers['Idempotency-Key'] = createIdempotencyKey();
  }

  let body: BodyInit | undefined;

  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 15000;
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}${toQueryString(options.query)}`, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : null;
      throw new ApiError(
        extractApiMessage(payload, response.status),
        response.status,
        payload,
        Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : null,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs / 1000}s.`, 0);
    }

    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
  } finally {
    window.clearTimeout(timeout);
  }
}
