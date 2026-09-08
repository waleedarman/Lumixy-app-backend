import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'ghost';
  children: ReactNode;
};

export function IconButton({
  label,
  size = 'md',
  variant = 'default',
  className = '',
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      className={`ui-icon-btn ui-icon-btn--${size} ui-icon-btn--${variant} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
