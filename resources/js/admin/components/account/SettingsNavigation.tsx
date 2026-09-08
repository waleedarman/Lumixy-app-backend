export type AccountSettingsSection = 'personal' | 'security' | 'contact' | 'whatsapp';

type SettingsNavItem = {
  id: AccountSettingsSection;
  label: string;
};

const NAV_ITEMS: SettingsNavItem[] = [
  { id: 'personal', label: 'المعلومات الشخصية' },
  { id: 'security', label: 'الأمان وكلمة المرور' },
  { id: 'contact', label: 'التواصل' },
  { id: 'whatsapp', label: 'رسائل واتساب' },
];

type SettingsNavigationProps = {
  value: AccountSettingsSection;
  onChange: (value: AccountSettingsSection) => void;
};

export function SettingsNavigation({ value, onChange }: SettingsNavigationProps) {
  return (
    <nav className="account-settings-nav" aria-label="أقسام الإعدادات">
      <div className="account-settings-nav__list" role="tablist" aria-orientation="vertical">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`account-tab-${item.id}`}
            aria-controls={`account-panel-${item.id}`}
            aria-selected={value === item.id}
            tabIndex={value === item.id ? 0 : -1}
            className={`account-settings-nav__item${value === item.id ? ' is-active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
