import type { ReactNode } from 'react';

type PageTransitionProps = {
  children: ReactNode;
};

/** Keeps page content mounted — no fade/remount on navigation (stable UI + cache). */
export function PageTransition({ children }: PageTransitionProps) {
  return <div className="admin-page-transition">{children}</div>;
}
