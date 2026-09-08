import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

type ProviderFiltersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  cityId: string;
  onCityChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  cityOptions: { id: string; name: string; parentName?: string | null }[];
  categories: { id: string; name: string }[];
  resultCount: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  advancedOpen: boolean;
  onAdvancedOpenChange: (open: boolean) => void;
  advancedContent: ReactNode;
  activeAdvancedCount?: number;
};

export function ProviderFiltersToolbar({
  search,
  onSearchChange,
  cityId,
  onCityChange,
  categoryId,
  onCategoryChange,
  cityOptions,
  categories,
  resultCount,
  hasActiveFilters,
  onClearFilters,
  advancedOpen,
  onAdvancedOpenChange,
  advancedContent,
  activeAdvancedCount = 0,
}: ProviderFiltersToolbarProps) {
  return (
    <>
      <section className="filters-toolbar">
        <div className="filters-toolbar__main">
          <label className="field field--search">
            <span>بحث</span>
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="ابحث باسم المزود"
            />
          </label>

          <label className="field field--filter">
            <span>المدينة</span>
            <select value={cityId} onChange={(event) => onCityChange(event.target.value)}>
              <option value="">الكل</option>
              {cityOptions.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.parentName ? `${city.parentName} / ${city.name}` : city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--filter">
            <span>الفئة</span>
            <select value={categoryId} onChange={(event) => onCategoryChange(event.target.value)}>
              <option value="">الكل</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <Button
            variant="secondary"
            size="md"
            className="filters-toolbar__advanced-btn"
            onClick={() => onAdvancedOpenChange(true)}
          >
            فلاتر متقدمة
            {activeAdvancedCount > 0 ? (
              <span className="filters-toolbar__advanced-badge">{activeAdvancedCount}</span>
            ) : null}
          </Button>
        </div>

        <div className="filters-toolbar__footer">
          <span className="result-count">{resultCount} نتيجة</span>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={onClearFilters}>
              مسح التصفية
            </Button>
          ) : null}
        </div>
      </section>

      {advancedOpen ? (
        <div
          className="filter-drawer-overlay"
          role="presentation"
          onClick={() => onAdvancedOpenChange(false)}
        >
          <aside
            className="filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="filter-drawer__header">
              <h2 id="filter-drawer-title">فلاتر متقدمة</h2>
              <button
                type="button"
                className="ui-icon-btn"
                aria-label="إغلاق"
                onClick={() => onAdvancedOpenChange(false)}
              >
                ×
              </button>
            </header>
            <div className="filter-drawer__body">{advancedContent}</div>
            <footer className="filter-drawer__footer">
              <Button variant="secondary" onClick={onClearFilters}>
                مسح الكل
              </Button>
              <Button variant="primary" onClick={() => onAdvancedOpenChange(false)}>
                تطبيق
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
    </>
  );
}
