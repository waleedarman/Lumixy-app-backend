export type NavGroup = 'main' | 'operations' | 'content' | 'reports' | 'system';

export type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  badge?: boolean;
  group: NavGroup;
};

export const NAV_ITEMS: NavItem[] = [
  { to: 'dashboard', label: 'نظرة عامة', end: true, group: 'main' },
  { to: 'providers', label: 'مزودو الخدمات', group: 'operations' },
  { to: 'notifications', label: 'الإشعارات', badge: true, group: 'operations' },
  { to: 'categories', label: 'الفئات والخدمات', group: 'content' },
  { to: 'promotions', label: 'إدارة الإعلانات', group: 'content' },
  { to: 'cities', label: 'المدن والمناطق', group: 'content' },
  { to: 'subscriptions', label: 'الإحصائيات', group: 'reports' },
  { to: 'admins', label: 'المشرفون', group: 'system' },
  { to: 'account', label: 'حسابي', group: 'system' },
];

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'نظرة عامة',
  providers: 'مزودو الخدمات',
  notifications: 'مركز الإشعارات',
  categories: 'الفئات والخدمات',
  promotions: 'إدارة الإعلانات',
  cities: 'المدن والمناطق',
  subscriptions: 'الإحصائيات',
  admins: 'المشرفون',
  account: 'حسابي',
  login: 'تسجيل الدخول',
  search: 'مزودو الخدمات',
};

export function getPageTitle(pathname: string): string {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '') || 'dashboard';
  const segment = trimmed.split('/')[0] || 'dashboard';

  if (trimmed.startsWith('categories/')) return 'تفاصيل الفئة';
  if (trimmed.startsWith('providers/')) return 'تفاصيل المزود';
  if (trimmed === 'promotions/new') return 'إضافة إعلان';
  if (trimmed.startsWith('promotions/') && trimmed.endsWith('/edit')) return 'تعديل إعلان';

  const navMatch = NAV_ITEMS.find((item) => trimmed === item.to || trimmed.startsWith(`${item.to}/`));
  if (navMatch) return navMatch.label;

  return PAGE_TITLES[segment] ?? 'لوحة الإدارة';
}

export function getPageBreadcrumbs(pathname: string): string[] {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (!trimmed || trimmed === 'dashboard') return [];

  const parts = trimmed.split('/');
  const root = parts[0];

  if (root === 'providers' && parts.length > 1) {
    return ['مزودو الخدمات'];
  }

  if (root === 'categories' && parts.length > 1) {
    return ['الفئات والخدمات'];
  }

  if (root === 'promotions') {
    if (parts[1] === 'new') return ['إدارة الإعلانات'];
    if (parts.length > 2 && parts[2] === 'edit') return ['إدارة الإعلانات'];
  }

  const navItem = NAV_ITEMS.find((item) => item.to === root);
  return navItem ? [navItem.label] : [];
}
