import type { ReactNode } from 'react';
import type { AccountSettingsSection } from './SettingsNavigation';
import { SettingsNavigation } from './SettingsNavigation';

type AccountSettingsLayoutProps = {
  activeSection: AccountSettingsSection;
  onSectionChange: (section: AccountSettingsSection) => void;
  children: ReactNode;
};

export function AccountSettingsLayout({
  activeSection,
  onSectionChange,
  children,
}: AccountSettingsLayoutProps) {
  return (
    <div className="account-settings-layout">
      <SettingsNavigation value={activeSection} onChange={onSectionChange} />
      <div className="account-settings-layout__divider" aria-hidden />
      <div
        className="account-settings-layout__content"
        role="tabpanel"
        id={`account-panel-${activeSection}`}
        aria-labelledby={`account-tab-${activeSection}`}
        aria-live="polite"
      >
        {children}
      </div>
    </div>
  );
}
