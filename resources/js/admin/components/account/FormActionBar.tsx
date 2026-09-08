import type { ReactNode } from 'react';

type FormActionBarProps = {
  children: ReactNode;
};

export function FormActionBar({ children }: FormActionBarProps) {
  return (
    <div className="form-action-bar">
      <div className="form-action-bar__actions">{children}</div>
    </div>
  );
}
