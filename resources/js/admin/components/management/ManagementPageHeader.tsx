import type { ReactNode } from 'react';

type ManagementPageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function ManagementPageHeader({ title, subtitle, actions }: ManagementPageHeaderProps) {
  return (
    <header className="mgmt-page__header">
      <div>
        <h1 className="mgmt-page__title">{title}</h1>
        {subtitle ? <p className="mgmt-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="mgmt-page__actions">{actions}</div> : null}
    </header>
  );
}
