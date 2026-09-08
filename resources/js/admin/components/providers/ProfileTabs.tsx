import { SegmentedTabs } from '../management/SegmentedTabs';

type ProfileTabItem<T extends string> = {
  key: T;
  label: string;
  badge?: number;
};

type ProfileTabsProps<T extends string> = {
  items: ProfileTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function ProfileTabs<T extends string>({ items, value, onChange }: ProfileTabsProps<T>) {
  return (
    <SegmentedTabs
      ariaLabel="أقسام الملف الشخصي"
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        count: item.badge,
      }))}
      value={value}
      onChange={onChange}
    />
  );
}
