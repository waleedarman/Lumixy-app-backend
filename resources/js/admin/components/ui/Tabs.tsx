import type { KeyboardEvent } from 'react';
import { IconImage } from '../icons/AdminIcons';

type TabItem<T extends string> = {
  key: T;
  label: string;
  badge?: number;
};

type TabsProps<T extends string> = {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  scrollable?: boolean;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className = '',
  scrollable = true,
}: TabsProps<T>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? 1 : -1;
    const next = (index + delta + items.length) % items.length;
    onChange(items[next].key);
  };

  return (
    <div
      className={`ui-segmented ${scrollable ? 'ui-segmented--scroll' : ''} ${className}`.trim()}
      role="tablist"
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={value === item.key}
          tabIndex={value === item.key ? 0 : -1}
          className={`ui-segmented__item ${value === item.key ? 'is-active' : ''}`}
          onClick={() => onChange(item.key)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {item.label}
          {typeof item.badge === 'number' && item.badge > 0 ? (
            <span className="ui-segmented__badge">{item.badge > 99 ? '99+' : item.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
