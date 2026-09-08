export function normalizeLoginEmail(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[\s\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g, '')
    .replace(/[＠﹫]/g, '@')
    .replace(/[。．｡]/g, '.')
    .toLowerCase();
}

export function validateLoginInput(email: string, password: string) {
  const errors: Record<string, string> = {};
  const trimmedEmail = normalizeLoginEmail(email);

  if (!trimmedEmail) {
    errors.email = 'البريد الإلكتروني فارغ';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'صيغة البريد الإلكتروني خاطئة';
  }

  if (!password) {
    errors.password = 'كلمة المرور فارغة';
  } else if (password.length < 6) {
    errors.password = 'كلمة المرور ضعيفة أو قصيرة جدًا';
  }

  return errors;
}
