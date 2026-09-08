import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft } from '../icons/AdminIcons';

export type KpiTone = 'blue' | 'green' | 'orange' | 'red';

type KpiCardProps = {
  label: string;
  value: number;
  description: string;
  to: string;
  linkLabel: string;
  tone: KpiTone;
  icon: ReactNode;
  secondary?: ReactNode;
};

export function KpiCard({
  label,
  value,
  description,
  to,
  linkLabel,
  tone,
  icon,
  secondary,
}: KpiCardProps) {
  return (
    <Link to={to} className={`dash-kpi dash-kpi--${tone}`}>
      <div className={`dash-kpi__icon dash-kpi__icon--${tone}`} aria-hidden>
        {icon}
      </div>

      <div className="dash-kpi__body">
        <span className="dash-kpi__label">{label}</span>
        <strong className="dash-kpi__value">{value.toLocaleString('ar')}</strong>
        <p className="dash-kpi__desc">{description}</p>
        {secondary ? <div className="dash-kpi__secondary">{secondary}</div> : null}
        <span className="dash-kpi__link">
          {linkLabel}
          <IconArrowLeft size={14} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
