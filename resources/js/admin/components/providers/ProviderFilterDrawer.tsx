import type { ProviderFilter } from '../../types';
import type { SubscriptionDrawerFilter } from '../../utils/providerFilters';

export type ProviderFilterDraft = {
  cityId: string;
  categoryId: string;
  subService: string;
  featuredOnly: boolean;
  accountStatus: ProviderFilter | 'all';
  subscriptionStatus: SubscriptionDrawerFilter;
};

type ProviderFilterDrawerProps = {
  open: boolean;
  draft: ProviderFilterDraft;
  cityOptions: { id: string; name: string; parentName?: string | null }[];
  categories: { id: string; name: string }[];
  subServices: string[];
  onDraftChange: (draft: ProviderFilterDraft) => void;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
};

export function ProviderFilterDrawer({
  open,
  draft,
  cityOptions,
  categories,
  subServices,
  onDraftChange,
  onClose,
  onApply,
  onClear,
}: ProviderFilterDrawerProps) {
  if (!open) return null;

  const update = (patch: Partial<ProviderFilterDraft>) => {
    onDraftChange({ ...draft, ...patch });
  };

  return (
    <div className="providers-filter-drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="providers-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="providers-filter-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="providers-filter-drawer__header">
          <h2 id="providers-filter-title">تصفية المزودين</h2>
          <button type="button" className="ui-icon-btn" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="providers-filter-drawer__body">
          <label className="field">
            <span className="field__label">المدينة</span>
            <select
              value={draft.cityId}
              onChange={(event) => update({ cityId: event.target.value })}
            >
              <option value="">الكل</option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.parentName ? `${city.parentName} / ${city.name}` : city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">الفئة</span>
            <select
              value={draft.categoryId}
              onChange={(event) =>
                update({ categoryId: event.target.value, subService: '' })
              }
            >
              <option value="">الكل</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          {subServices.length > 0 ? (
            <label className="field">
              <span className="field__label">الخدمة الفرعية</span>
              <select
                value={draft.subService}
                onChange={(event) => update({ subService: event.target.value })}
              >
                <option value="">الكل</option>
                {subServices.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span className="field__label">حالة الحساب</span>
            <select
              value={draft.accountStatus}
              onChange={(event) =>
                update({ accountStatus: event.target.value as ProviderFilter | 'all' })
              }
            >
              <option value="all">الكل</option>
              <option value="pending">قيد المراجعة</option>
              <option value="active">نشط</option>
              <option value="deactivated">معطل</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">حالة الاشتراك</span>
            <select
              value={draft.subscriptionStatus}
              onChange={(event) =>
                update({
                  subscriptionStatus: event.target.value as SubscriptionDrawerFilter,
                })
              }
            >
              <option value="all">الكل</option>
              <option value="active">اشتراك فعّال</option>
              <option value="expiringSoon">ينتهي قريباً</option>
              <option value="expired">منتهي</option>
              <option value="not_subscribed">غير مشترك</option>
            </select>
          </label>

          <div className="providers-filter-drawer__switch">
            <div>
              <span className="providers-filter-drawer__switch-label">التميز</span>
              <span className="providers-filter-drawer__switch-hint">عرض المزودين المميزين فقط</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={draft.featuredOnly}
                onChange={(event) => update({ featuredOnly: event.target.checked })}
              />
              <span />
            </label>
          </div>
        </div>

        <footer className="providers-filter-drawer__footer">
          <button type="button" className="btn btn-secondary" onClick={onClear}>
            مسح الكل
          </button>
          <button type="button" className="btn btn-primary" onClick={onApply}>
            تطبيق الفلاتر
          </button>
        </footer>
      </aside>
    </div>
  );
}
