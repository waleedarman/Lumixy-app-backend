import type { AppCategory, AppCityOption, ProviderProfile, ProviderStatus } from '../types';
import { resolveMediaUrl } from '../utils/mediaUrl';

type BackendCity = {
  id: string;
  name: string;
  parent_id?: string | null;
  parentId?: string | null;
  parent_name?: string | null;
  parent?: BackendCity | null;
  children?: BackendCity[];
};

type BackendSubcategory = { id: string; name: string };

type BackendCategory = {
  id: string;
  name: string;
  icon?: string | null;
  subcategories?: BackendSubcategory[];
};

type BackendGalleryItem = { id: string; image_url?: string | null; sort_order?: number | null };

type BackendApplication = {
  application_status?: string | null;
  submitted_at?: string | null;
};

type BackendUser = {
  id?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  status?: string | null;
};

type BackendProviderProfile = {
  id: string;
  provider_name?: string | null;
  profile_image?: string | null;
  bio?: string | null;
  category_id?: string | null;
  city_id?: string | null;
  whatsapp_number?: string | null;
  instagram_username?: string | null;
  facebook_url?: string | null;
  is_featured?: boolean;
  is_currently_featured?: boolean;
  subscription_started_at?: string | null;
  subscription_ends_at?: string | null;
  subscription_status?: string | null;
  subscription_days_remaining?: number | null;
  is_subscription_active?: boolean;
  is_subscription_expired?: boolean;
  needs_subscription_renewal?: boolean;
  city?: BackendCity | null;
  category?: BackendCategory | null;
  sub_services?: BackendSubcategory[];
  gallery?: BackendGalleryItem[];
  latest_application?: BackendApplication | null;
  applications?: BackendApplication[];
  user?: BackendUser | null;
};

function buildBackendCityLabel(city?: BackendCity | null): string {
  if (!city) return '';
  const parentName = city.parent?.name || city.parent_name || null;
  return parentName ? `${parentName} / ${city.name}` : city.name;
}

function normalizeStatus(profile: BackendProviderProfile, user?: BackendUser | null): ProviderStatus {
  const application = profile.latest_application || profile.applications?.[0] || null;
  const userStatus = `${user?.status || ''}`.toLowerCase();
  const applicationStatus = `${application?.application_status || ''}`.toLowerCase();

  if (
    userStatus === 'deactivated' ||
    userStatus === 'disabled' ||
    userStatus === 'suspended' ||
    applicationStatus === 'rejected'
  ) {
    return 'DEACTIVATED';
  }

  if (userStatus === 'active' && applicationStatus === 'approved') {
    return 'ACTIVE';
  }

  if (applicationStatus === 'pending') {
    return 'PENDING';
  }

  if (applicationStatus === 'approved') {
    return 'ACTIVE';
  }

  return 'PENDING';
}

export function mapCategory(category: BackendCategory): AppCategory {
  const subServiceOptions = (category.subcategories || []).map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const rawIcon = category.icon?.trim() || '';
  const icon =
    rawIcon && (/^https?:\/\//i.test(rawIcon) || rawIcon.includes('/storage/'))
      ? resolveMediaUrl(rawIcon) || rawIcon
      : rawIcon;

  return {
    id: category.id,
    name: category.name,
    icon,
    subServices: subServiceOptions.map((item) => item.name),
    subServiceOptions,
  };
}

export function mapCityOption(city: BackendCity, parent?: BackendCity | null): AppCityOption {
  const resolvedParent = city.parent || parent || null;

  return {
    id: city.id,
    name: city.name,
    parentId: city.parent_id ?? city.parentId ?? resolvedParent?.id ?? null,
    parentName: resolvedParent?.name ?? city.parent_name ?? null,
    children: (city.children || []).map((child) => mapCityOption(child, city)),
  };
}

function sortCityOptions(options: AppCityOption[]): AppCityOption[] {
  return [...options]
    .map((option) => ({
      ...option,
      children: sortCityOptions(option.children || []),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

function extractCityArray(payload: unknown): BackendCity[] {
  if (Array.isArray(payload)) return payload as BackendCity[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  for (const key of ['data', 'cities', 'results', 'items']) {
    if (Array.isArray(record[key])) return record[key] as BackendCity[];
  }

  return [];
}

function mapFlatCityOptions(cities: BackendCity[]): AppCityOption[] {
  const nodes = new Map<string, AppCityOption>();
  const roots: AppCityOption[] = [];

  for (const city of cities) {
    if (!city?.id || !city?.name) continue;
    nodes.set(String(city.id), {
      id: String(city.id),
      name: String(city.name),
      parentId: city.parent_id ?? city.parentId ?? city.parent?.id ?? null,
      parentName: city.parent?.name ?? city.parent_name ?? null,
      children: [],
    });
  }

  for (const city of cities) {
    if (!city?.id || !city?.name) continue;
    const node = nodes.get(String(city.id));
    if (!node) continue;

    const parentNode = node.parentId ? nodes.get(String(node.parentId)) : null;
    if (parentNode) {
      node.parentName = node.parentName || parentNode.name;
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return sortCityOptions(roots);
}

export function mapCityOptionsResponse(payload: unknown): AppCityOption[] {
  const cities = extractCityArray(payload);
  if (cities.length === 0) return [];

  const hasNestedChildren = cities.some((city) => Array.isArray(city.children) && city.children.length > 0);
  if (hasNestedChildren) {
    return sortCityOptions(cities.map((city) => mapCityOption(city)));
  }

  return mapFlatCityOptions(cities);
}

export function mapProviderProfile(profile: BackendProviderProfile, user?: BackendUser | null): ProviderProfile {
  const owner = user || profile.user || null;

  return {
    id: profile.id,
    ownerUserId: owner?.id || undefined,
    fullName: profile.provider_name || owner?.full_name || '',
    email: owner?.email || '',
    phone: owner?.phone || '',
    photoUrl: resolveMediaUrl(profile.profile_image),
    city: buildBackendCityLabel(profile.city),
    cityId: profile.city?.id || profile.city_id || undefined,
    bio: profile.bio || '',
    categoryId: profile.category?.id || profile.category_id || '',
    categoryName: profile.category?.name || '',
    subServices: (profile.sub_services || []).map((item) => item.name),
    subServiceIds: (profile.sub_services || []).map((item) => item.id),
    whatsapp: profile.whatsapp_number || '',
    instagram: profile.instagram_username || '',
    website: profile.facebook_url || '',
    galleryItems: (profile.gallery || [])
      .filter((item) => item.image_url)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item) => ({
        id: item.id,
        url: resolveMediaUrl(item.image_url) as string,
      })),
    status: normalizeStatus(profile, owner),
    isFeatured: Boolean(profile.is_currently_featured ?? profile.is_featured),
    subscriptionStartedAt: profile.subscription_started_at || undefined,
    subscriptionEndsAt: profile.subscription_ends_at || undefined,
    subscriptionStatus: profile.subscription_status || undefined,
    subscriptionDaysRemaining:
      typeof profile.subscription_days_remaining === 'number'
        ? profile.subscription_days_remaining
        : undefined,
    isSubscriptionActive: Boolean(profile.is_subscription_active),
    isSubscriptionExpired: Boolean(profile.is_subscription_expired),
    needsSubscriptionRenewal: Boolean(profile.needs_subscription_renewal),
  };
}

export function formatDate(value?: string, locale = 'ar'): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function statusLabel(status: ProviderStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'نشط';
    case 'PENDING':
      return 'قيد المراجعة';
    case 'DEACTIVATED':
      return 'معطل';
    default:
      return status;
  }
}

export function flattenCities(options: AppCityOption[]): AppCityOption[] {
  const result: AppCityOption[] = [];

  function walk(items: AppCityOption[]) {
    for (const item of items) {
      result.push(item);
      if (item.children.length > 0) walk(item.children);
    }
  }

  walk(options);
  return result;
}
