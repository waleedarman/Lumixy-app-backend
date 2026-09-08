import type { ReactNode } from 'react';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-screen">
      <div className="auth-screen__inner">{children}</div>
    </div>
  );
}
