type FeaturedSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCommit: (next: boolean) => void;
};

export function FeaturedSwitch({ checked, disabled = false, label, onCommit }: FeaturedSwitchProps) {
  return (
    <label
      className={`switch switch--sm switch--smooth${disabled ? ' switch--disabled' : ''}`}
      onClick={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => {
          event.stopPropagation();
          onCommit(event.target.checked);
        }}
        aria-label={label}
      />
      <span />
    </label>
  );
}
