import type { ReactNode } from 'react';

type LtrTextProps = {
  children: ReactNode;
  className?: string;
};

export function LtrText({ children, className = '' }: LtrTextProps) {
  return <span className={`ltr-text ${className}`.trim()}>{children}</span>;
}
