import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type MetricCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  tone?: 'default' | 'accent' | 'warning' | 'danger' | 'success' | 'info';
  to?: string;
  onClick?: () => void;
  icon?: ReactNode;
};

export function MetricCard({ label, value, hint, tone = 'default', to, onClick, icon }: MetricCardProps) {
  const className = `metric-card metric-card--${tone} ${to || onClick ? 'metric-card--interactive' : ''}`;

  const content = (
    <>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        {icon ? <span className="metric-card__icon">{icon}</span> : null}
      </div>
      <strong className="metric-card__value">{value}</strong>
      {hint ? <p className="metric-card__hint">{hint}</p> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <article className={className}>{content}</article>;
}
