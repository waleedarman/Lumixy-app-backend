import { FormEvent, useMemo, useState } from 'react';
import {
  IN_APP_SCREEN_OPTIONS,
  PROMOTION_ACTION_OPTIONS,
  uploadPromotionImage,
  type PromotionFormPayload,
} from '../../api/promotionService';
import type { AppCategory, AppPromotion, ProviderProfile, PromotionActionType } from '../../types';
import { Button } from '../ui/Button';
import { FormField } from '../ui/FormField';
import { PromotionPreviewCard } from './PromotionPreviewCard';

export type PromotionDraft = {
  title: string;
  description: string;
  image: string;
  imagePublicId: string;
  mobileImage: string;
  mobileImagePublicId: string;
  buttonText: string;
  actionType: PromotionActionType;
  actionValue: string;
  displayOrder: string;
  isActive: boolean;
  showSponsoredBadge: boolean;
  showSectionTitle: boolean;
  startDate: string;
  endDate: string;
};

export function createPromotionDraft(promotion?: AppPromotion | null): PromotionDraft {
  return {
    title: promotion?.title ?? '',
    description: promotion?.description ?? '',
    image: promotion?.image ?? '',
    imagePublicId: promotion?.imagePublicId ?? '',
    mobileImage: promotion?.mobileImage ?? '',
    mobileImagePublicId: promotion?.mobileImagePublicId ?? '',
    buttonText: promotion?.buttonText ?? '',
    actionType: promotion?.actionType ?? 'none',
    actionValue: promotion?.actionValue ?? '',
    displayOrder: promotion ? String(promotion.displayOrder) : '',
    isActive: promotion?.isActive ?? true,
    showSponsoredBadge: promotion?.showSponsoredBadge ?? true,
    showSectionTitle: promotion?.showSectionTitle ?? true,
    startDate: promotion?.startDate ? promotion.startDate.slice(0, 16) : '',
    endDate: promotion?.endDate ? promotion.endDate.slice(0, 16) : '',
  };
}

export function draftToPayload(draft: PromotionDraft): PromotionFormPayload {
  return {
    title: draft.title.trim() || null,
    description: draft.description.trim() || null,
    image: draft.image.trim(),
    mobile_image: draft.mobileImage.trim() || null,
    image_public_id: draft.imagePublicId.trim() || null,
    mobile_image_public_id: draft.mobileImagePublicId.trim() || null,
    image_path: draft.imagePublicId.trim() || null,
    mobile_image_path: draft.mobileImagePublicId.trim() || null,
    button_text: draft.buttonText.trim() || null,
    action_type: draft.actionType,
    action_value: draft.actionValue.trim() || null,
    display_order: draft.displayOrder ? Number(draft.displayOrder) : undefined,
    is_active: draft.isActive,
    show_sponsored_badge: draft.showSponsoredBadge,
    show_section_title: draft.showSectionTitle,
    start_date: draft.startDate ? new Date(draft.startDate).toISOString() : null,
    end_date: draft.endDate ? new Date(draft.endDate).toISOString() : null,
  };
}

type PromotionFormProps = {
  editing: AppPromotion | null;
  categories: AppCategory[];
  providers: ProviderProfile[];
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (payload: PromotionFormPayload) => Promise<void>;
};

export function PromotionForm({
  editing,
  categories,
  providers,
  busy = false,
  onCancel,
  onSubmit,
}: PromotionFormProps) {
  const [draft, setDraft] = useState<PromotionDraft>(() => createPromotionDraft(editing));
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subServices = useMemo(
    () =>
      categories.flatMap((category) =>
        category.subServiceOptions.map((service) => ({
          ...service,
          categoryName: category.name,
        })),
      ),
    [categories],
  );

  const previewPromotion = useMemo(
    () => ({
      // The app prefers the mobile image, so the preview must do the same.
      image: draft.mobileImage || draft.image,
      title: draft.title || null,
      description: draft.description || null,
      buttonText: draft.buttonText || null,
    }),
    [draft],
  );

  const handleImageUpload = async (file: File | undefined, target: 'default' | 'mobile') => {
    if (!file) return;
    setUploadBusy(true);
    setError(null);
    try {
      const uploaded = await uploadPromotionImage(file);
      setDraft((current) =>
        target === 'mobile'
          ? { ...current, mobileImage: uploaded.secure_url, mobileImagePublicId: uploaded.public_id }
          : { ...current, image: uploaded.secure_url, imagePublicId: uploaded.public_id },
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع الصورة.');
    } finally {
      setUploadBusy(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.image.trim()) {
      setError('صورة الإعلان مطلوبة.');
      return;
    }
    setError(null);
    await onSubmit(draftToPayload(draft));
  };

  return (
    <form className="promotions-form promotions-form--page" onSubmit={handleSubmit}>
      <div className="promotions-form-page__layout">
        <div className="promotions-form-page__main">
          <section className="promotions-form-page__section">
            <h2 className="promotions-form-page__section-title">صورة الإعلان</h2>
            <div className="promotions-form__upload">
              <label className="field">
                <span className="field__label">
                  ارفع صورة الإعلان <span className="field__required">*</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="promotions-form__file-input"
                  onChange={(event) => void handleImageUpload(event.target.files?.[0], 'default')}
                />
                <span className="field__hint">PNG أو JPG — الصورة الأساسية للإعلان.</span>
              </label>
              {draft.image ? (
                <FormField
                  label="رابط الصورة (للمراجعة)"
                  value={draft.image}
                  readOnly
                />
              ) : null}

              <label className="field">
                <span className="field__label">صورة مخصصة للموبايل (اختياري)</span>
                <input
                  type="file"
                  accept="image/*"
                  className="promotions-form__file-input"
                  onChange={(event) => void handleImageUpload(event.target.files?.[0], 'mobile')}
                />
                <span className="field__hint">
                  إن رفعتها، سيعرضها التطبيق بدل الصورة الأساسية على الهاتف.
                </span>
              </label>
              {draft.mobileImage ? (
                <>
                  <FormField
                    label="رابط صورة الموبايل (للمراجعة)"
                    value={draft.mobileImage}
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setDraft((current) => ({ ...current, mobileImage: '', mobileImagePublicId: '' }))
                    }
                  >
                    إزالة صورة الموبايل
                  </Button>
                </>
              ) : null}

              {uploadBusy ? <span className="field__hint">جاري رفع الصورة...</span> : null}
            </div>
          </section>

          <section className="promotions-form-page__section">
            <h2 className="promotions-form-page__section-title">المحتوى</h2>
            <div className="promotions-form__grid">
              <div className="promotions-form__grid promotions-form__grid--two">
                <FormField
                  label="العنوان (اختياري)"
                  value={draft.title}
                  onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                />
                <FormField
                  label="نص الزر (اختياري)"
                  value={draft.buttonText}
                  onChange={(event) => setDraft((current) => ({ ...current, buttonText: event.target.value }))}
                  placeholder="اعرف أكثر"
                />
              </div>

              <FormField
                as="textarea"
                label="الوصف المختصر (اختياري)"
                rows={4}
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
          </section>

          <section className="promotions-form-page__section">
            <h2 className="promotions-form-page__section-title">الإجراء عند الضغط</h2>
            <div className="promotions-form__grid">
              <FormField
                as="select"
                label="نوع الإجراء"
                value={draft.actionType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    actionType: event.target.value as PromotionActionType,
                    actionValue: '',
                  }))
                }
              >
                {PROMOTION_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FormField>

              {draft.actionType === 'external_url' ? (
                <FormField
                  label="الرابط الخارجي"
                  value={draft.actionValue}
                  onChange={(event) => setDraft((current) => ({ ...current, actionValue: event.target.value }))}
                  placeholder="https://example.com"
                />
              ) : null}

              {draft.actionType === 'in_app_screen' ? (
                <FormField
                  as="select"
                  label="الصفحة داخل التطبيق"
                  value={draft.actionValue}
                  onChange={(event) => setDraft((current) => ({ ...current, actionValue: event.target.value }))}
                >
                  <option value="">اختر الصفحة</option>
                  {IN_APP_SCREEN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FormField>
              ) : null}

              {draft.actionType === 'provider_profile' ? (
                <FormField
                  as="select"
                  label="مزود الخدمة"
                  value={draft.actionValue}
                  onChange={(event) => setDraft((current) => ({ ...current, actionValue: event.target.value }))}
                >
                  <option value="">اختر المزود</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.fullName}
                    </option>
                  ))}
                </FormField>
              ) : null}

              {draft.actionType === 'category' ? (
                <FormField
                  as="select"
                  label="الفئة"
                  value={draft.actionValue}
                  onChange={(event) => setDraft((current) => ({ ...current, actionValue: event.target.value }))}
                >
                  <option value="">اختر الفئة</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </FormField>
              ) : null}

              {draft.actionType === 'sub_service' ? (
                <FormField
                  as="select"
                  label="الخدمة"
                  value={draft.actionValue}
                  onChange={(event) => setDraft((current) => ({ ...current, actionValue: event.target.value }))}
                >
                  <option value="">اختر الخدمة</option>
                  {subServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.categoryName} · {service.name}
                    </option>
                  ))}
                </FormField>
              ) : null}
            </div>
          </section>

          <section className="promotions-form-page__section">
            <h2 className="promotions-form-page__section-title">الجدولة والظهور</h2>
            <div className="promotions-form__grid">
              <div className="promotions-form__grid promotions-form__grid--two">
                <FormField
                  label="ترتيب الظهور"
                  type="number"
                  min={0}
                  value={draft.displayOrder}
                  onChange={(event) => setDraft((current) => ({ ...current, displayOrder: event.target.value }))}
                />
                <FormField
                  as="select"
                  label="حالة الإعلان"
                  value={draft.isActive ? '1' : '0'}
                  onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.value === '1' }))}
                >
                  <option value="1">فعال</option>
                  <option value="0">غير فعال</option>
                </FormField>
              </div>

              <div className="promotions-form__grid promotions-form__grid--two">
                <FormField
                  label="تاريخ ووقت البداية"
                  type="datetime-local"
                  value={draft.startDate}
                  onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))}
                />
                <FormField
                  label="تاريخ ووقت النهاية"
                  type="datetime-local"
                  value={draft.endDate}
                  onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))}
                />
              </div>

              <div className="promotions-form__grid promotions-form__grid--two">
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked={draft.showSponsoredBadge}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, showSponsoredBadge: event.target.checked }))
                    }
                  />
                  <span className="field__label">إظهار شارة «مموّل»</span>
                </label>
                <label className="field field--checkbox">
                  <input
                    type="checkbox"
                    checked={draft.showSectionTitle}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, showSectionTitle: event.target.checked }))
                    }
                  />
                  <span className="field__label">إظهار عنوان القسم</span>
                </label>
              </div>
            </div>
          </section>
        </div>

        <aside className="promotions-form-page__preview">
          <div className="promotions-form-page__preview-sticky">
            <h2 className="promotions-form-page__section-title">معاينة الإعلان</h2>
            {draft.showSectionTitle ? (
              <div className="promotions-page__section-head">
                <strong>إعلانات مميزة</strong>
                {draft.showSponsoredBadge ? <span className="promotions-page__sponsored">مموّل</span> : null}
              </div>
            ) : null}
            <PromotionPreviewCard promotion={previewPromotion} />
          </div>
        </aside>
      </div>

      {error ? <p className="field-error">{error}</p> : null}

      <div className="promotions-form-page__actions">
        <Button type="button" variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" disabled={busy || uploadBusy}>
          {busy ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إنشاء الإعلان'}
        </Button>
      </div>
    </form>
  );
}
