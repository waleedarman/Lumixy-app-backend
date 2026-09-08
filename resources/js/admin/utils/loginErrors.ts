import { ApiError } from '../api/client';

export function getFriendlyLoginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'تعذر تسجيل الدخول. حاول مرة أخرى.';
  }

  const rawMessage = `${error.message || ''}`.toLowerCase();
  const details = error.details as Record<string, unknown> | null;
  const validationErrors =
    details?.errors && typeof details.errors === 'object'
      ? Object.values(details.errors as Record<string, unknown>)
          .flat()
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
      : '';
  const combined = `${rawMessage} ${validationErrors}`.trim();

  if (error.status === 403 || combined.includes('inactive')) {
    return 'حساب المشرف غير نشط. تواصل مع الإدارة.';
  }

  if (error.status === 429 || combined.includes('too many')) {
    if (error.retryAfterSeconds && error.retryAfterSeconds > 0) {
      const minutes = Math.max(1, Math.ceil(error.retryAfterSeconds / 60));
      return `محاولات كثيرة. انتظر ${minutes} دقيقة ثم حاول مرة أخرى.`;
    }

    return 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.';
  }

  if (
    error.status === 422 &&
    (combined.includes('invalid credentials') ||
      combined.includes('credentials') ||
      combined.includes('password'))
  ) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تأكد أنك تستخدم حساب مشرف (Admin) وليس حساب مزود.';
  }

  if (combined.includes('email') && (combined.includes('required') || combined.includes('valid'))) {
    return 'صيغة البريد الإلكتروني غير صحيحة.';
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return 'تعذر تسجيل الدخول. حاول مرة أخرى.';
}
