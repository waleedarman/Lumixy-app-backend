type SegmentedTab<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type SegmentedTabsProps<T extends string> = {
  items: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = 'تصفية',
}: SegmentedTabsProps<T>) {
  return (
    <div className="mgmt-segmented-tabs" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          className={`mgmt-segmented-tabs__item${value === item.key ? ' is-active' : ''}`}
          onClick={() => onChange(item.key)}
        >
          <span>{item.label}</span>
          {typeof item.count === 'number' && item.count > 0 ? (
            <span className="mgmt-segmented-tabs__count">{item.count.toLocaleString('ar')}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
