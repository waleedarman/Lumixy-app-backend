import type { ReactNode } from 'react';
import { IconRefresh, IconSearch, IconSlidersHorizontal } from '../icons/AdminIcons';
import { IconButton } from '../ui/IconButton';

export type SortOption<T extends string = string> = {
  value: T;
  label: string;
};

type ManagementToolbarProps<T extends string = string> = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  resultCount?: number;
  resultLabel?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  sort?: T;
  sortOptions?: SortOption<T>[];
  onSortChange?: (value: T) => void;
  trailing?: ReactNode;
};

export function ManagementToolbar<T extends string = string>({
  search,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  resultCount,
  resultLabel = 'نتيجة',
  refreshing = false,
  onRefresh,
  onOpenFilters,
  activeFilterCount = 0,
  sort,
  sortOptions,
  onSortChange,
  trailing,
}: ManagementToolbarProps<T>) {
  const showSearch = typeof search === 'string' && onSearchChange;
  const showSort = sort && sortOptions && sortOptions.length > 0 && onSortChange;

  return (
    <div className="mgmt-toolbar">
      {showSearch ? (
        <div className="mgmt-toolbar__search">
          <IconSearch size={18} className="mgmt-toolbar__search-icon" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}

      <div className="mgmt-toolbar__actions">
        {onOpenFilters ? (
          <button type="button" className="mgmt-toolbar__filter-btn" onClick={onOpenFilters}>
            <IconSlidersHorizontal size={16} aria-hidden />
            تصفية
            {activeFilterCount > 0 ? (
              <span className="mgmt-toolbar__filter-badge">{activeFilterCount}</span>
            ) : null}
          </button>
        ) : null}

        {showSort ? (
          <label className="mgmt-toolbar__sort">
            <span className="sr-only">ترتيب النتائج</span>
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as T)}
              aria-label="ترتيب النتائج"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {typeof resultCount === 'number' ? (
          <span className="mgmt-toolbar__count">
            {resultCount.toLocaleString('ar')} {resultLabel}
          </span>
        ) : null}

        {onRefresh ? (
          <IconButton
            label={refreshing ? 'جاري التحديث' : 'تحديث البيانات'}
            disabled={refreshing}
            onClick={onRefresh}
          >
            <span className={refreshing ? 'ui-spin' : ''}>
              <IconRefresh size={18} />
            </span>
          </IconButton>
        ) : null}

        {trailing}
      </div>
    </div>
  );
}
