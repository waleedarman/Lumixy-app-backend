export type FilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type FilterChipsProps = {
  chips: FilterChip[];
};

export function FilterChips({ chips }: FilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="mgmt-filter-chips" aria-label="الفلاتر النشطة">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="mgmt-filter-chips__item"
          onClick={chip.onRemove}
          aria-label={`إزالة فلتر ${chip.label}`}
        >
          <span>{chip.label}</span>
          <span className="mgmt-filter-chips__remove" aria-hidden>
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
