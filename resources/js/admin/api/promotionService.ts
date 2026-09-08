import { apiRequest } from './client';
import { cachedRequest, invalidateRequestCache } from './requestCache';
import { emitAdminSync } from '../services/adminSync';
import type { AppPromotion, PromotionActionType } from '../types';

export const PROMOTION_CACHE_KEY = 'admin:promotions';

export type PromotionFormPayload = {
  title?: string | null;
  description?: string | null;
  image: string;
  mobile_image?: string | null;
  image_public_id?: string | null;
  mobile_image_public_id?: string | null;
  image_path?: string | null;
  mobile_image_path?: string | null;
  button_text?: string | null;
  action_type: PromotionActionType;
  action_value?: string | null;
  display_order?: number;
  is_active?: boolean;
  show_sponsored_badge?: boolean;
  show_section_title?: boolean;
  start_date?: string | null;
  end_date?: string | null;
};

function mapPromotion(item: any): AppPromotion {
  return {
    id: String(item.id),
    title: item.title ?? null,
    description: item.description ?? null,
    image: item.image ?? '',
    mobileImage: item.mobile_image ?? null,
    imagePublicId: item.image_path ?? item.image_public_id ?? null,
    mobileImagePublicId: item.mobile_image_path ?? item.mobile_image_public_id ?? null,
    buttonText: item.button_text ?? null,
    actionType: (item.action_type ?? 'none') as PromotionActionType,
    actionValue: item.action_value ?? null,
    displayOrder: Number(item.display_order ?? 0),
    isActive: Boolean(item.is_active),
    showSponsoredBadge: Boolean(item.show_sponsored_badge ?? true),
    showSectionTitle: Boolean(item.show_section_title ?? true),
    startDate: item.start_date ?? null,
    endDate: item.end_date ?? null,
    clickCount: Number(item.click_count ?? 0),
    createdAt: item.created_at ?? undefined,
    updatedAt: item.updated_at ?? undefined,
  };
}

function invalidatePromotionCaches() {
  invalidateRequestCache(PROMOTION_CACHE_KEY);
  emitAdminSync('promotions');
}

export async function fetchAdminPromotions(options?: { force?: boolean }): Promise<AppPromotion[]> {
  if (options?.force) {
    invalidateRequestCache(PROMOTION_CACHE_KEY);
  }

  return cachedRequest(PROMOTION_CACHE_KEY, async () => {
    const items = await apiRequest<any[]>('/admin/promotions', { auth: true });
    return items.map(mapPromotion);
  });
}

export async function createPromotion(payload: PromotionFormPayload): Promise<AppPromotion> {
  const response = await apiRequest<any>('/admin/promotions', {
    method: 'POST',
    auth: true,
    body: payload,
  });
  invalidatePromotionCaches();
  return mapPromotion(response.promotion);
}

export async function updatePromotion(id: string, payload: Partial<PromotionFormPayload>): Promise<AppPromotion> {
  const response = await apiRequest<any>(`/admin/promotions/${id}`, {
    method: 'PUT',
    auth: true,
    body: payload,
  });
  invalidatePromotionCaches();
  return mapPromotion(response.promotion);
}

export async function deletePromotion(id: string): Promise<void> {
  await apiRequest(`/admin/promotions/${id}`, {
    method: 'DELETE',
    auth: true,
    idempotent: true,
  });
  invalidatePromotionCaches();
}

export async function togglePromotion(id: string): Promise<AppPromotion> {
  const response = await apiRequest<any>(`/admin/promotions/${id}/toggle`, {
    method: 'POST',
    auth: true,
  });
  invalidatePromotionCaches();
  return mapPromotion(response.promotion);
}

export async function duplicatePromotion(id: string): Promise<AppPromotion> {
  const response = await apiRequest<any>(`/admin/promotions/${id}/duplicate`, {
    method: 'POST',
    auth: true,
    idempotent: true,
  });
  invalidatePromotionCaches();
  return mapPromotion(response.promotion);
}

export async function reorderPromotions(orderedIds: string[]): Promise<AppPromotion[]> {
  const response = await apiRequest<any>('/admin/promotions/reorder', {
    method: 'POST',
    auth: true,
    body: { ordered_ids: orderedIds },
  });
  invalidatePromotionCaches();
  return (response.promotions ?? []).map(mapPromotion);
}

export async function uploadPromotionImage(file: File): Promise<{ secure_url: string; public_id: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const payload = await apiRequest<{
    url: string;
    path: string;
    secure_url: string;
    public_id: string;
  }>('/admin/promotions/media', {
    method: 'POST',
    auth: true,
    body: formData,
    timeoutMs: 60000,
  });

  return {
    secure_url: payload.secure_url || payload.url,
    public_id: payload.public_id || payload.path,
  };
}

export { mapPromotion };

export function getPromotionStatusLabel(promotion: AppPromotion): string {
  if (!promotion.isActive) return 'غير فعال';

  const now = Date.now();
  if (promotion.startDate && new Date(promotion.startDate).getTime() > now) {
    return 'مجدول';
  }
  if (promotion.endDate && new Date(promotion.endDate).getTime() < now) {
    return 'منتهي';
  }

  return 'فعال';
}

export const PROMOTION_ACTION_OPTIONS: Array<{ value: PromotionActionType; label: string }> = [
  { value: 'none', label: 'بدون إجراء' },
  { value: 'external_url', label: 'فتح رابط خارجي' },
  { value: 'in_app_screen', label: 'فتح صفحة داخل التطبيق' },
  { value: 'provider_profile', label: 'فتح بروفايل مزود خدمة' },
  { value: 'category', label: 'فتح فئة محددة' },
  { value: 'sub_service', label: 'فتح خدمة محددة' },
];

export const IN_APP_SCREEN_OPTIONS = [
  { value: 'search', label: 'البحث' },
  { value: 'services', label: 'الخدمات' },
  { value: 'provider_list_all', label: 'جميع المزودين' },
  { value: 'provider_list_featured', label: 'المزودون المميزون' },
  { value: 'notifications', label: 'الإشعارات' },
];
