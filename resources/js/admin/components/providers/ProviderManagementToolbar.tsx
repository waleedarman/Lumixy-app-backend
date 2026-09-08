import { ManagementToolbar } from '../management/ManagementToolbar';

export type ProviderSort = 'featured' | 'name' | 'subscription';

type ProviderManagementToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  sort: ProviderSort;
  onSortChange: (value: ProviderSort) => void;
};

const SORT_OPTIONS = [
  { value: 'featured' as const, label: 'المميزون أولاً' },
  { value: 'name' as const, label: 'الاسم' },
  { value: 'subscription' as const, label: 'تاريخ انتهاء الاشتراك' },
];

export function ProviderManagementToolbar(props: ProviderManagementToolbarProps) {
  return (
    <ManagementToolbar
      search={props.search}
      onSearchChange={props.onSearchChange}
      searchPlaceholder="ابحث بالاسم أو رقم الهاتف"
      resultCount={props.resultCount}
      refreshing={props.refreshing}
      onRefresh={props.onRefresh}
      onOpenFilters={props.onOpenFilters}
      activeFilterCount={props.activeFilterCount}
      sort={props.sort}
      sortOptions={SORT_OPTIONS}
      onSortChange={props.onSortChange}
    />
  );
}
