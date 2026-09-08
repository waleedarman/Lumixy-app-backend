import type { ReactNode } from 'react';
import { ManagementPageHeader } from '../management/ManagementPageHeader';

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <ManagementPageHeader
      title={title}
      subtitle={description}
      actions={actions}
    />
  );
}
