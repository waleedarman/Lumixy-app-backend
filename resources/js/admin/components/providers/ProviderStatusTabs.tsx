import type { ProviderFilter } from '../../types';
import { SegmentedTabs } from '../management/SegmentedTabs';
import { PROVIDER_STATUS_TABS } from '../../utils/providerFilters';

type ProviderStatusTabsProps = {
  value: ProviderFilter;
  counts: Partial<Record<ProviderFilter, number>>;
  onChange: (value: ProviderFilter) => void;
};

export function ProviderStatusTabs({ value, counts, onChange }: ProviderStatusTabsProps) {
  return (
    <SegmentedTabs
      ariaLabel="تصفية حسب الحالة"
      value={value}
      onChange={onChange}
      items={PROVIDER_STATUS_TABS.map((item) => ({
        key: item.key,
        label: item.label,
        count: counts[item.key],
      }))}
    />
  );
}
