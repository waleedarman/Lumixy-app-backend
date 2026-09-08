import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconArrowLeft } from '../icons/AdminIcons';

type QuickActionTone = 'blue' | 'purple' | 'green' | 'orange';

type QuickActionItemProps = {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  tone: QuickActionTone;
};

export function QuickActionItem({ to, title, description, icon, tone }: QuickActionItemProps) {
  return (
    <Link to={to} className={`dash-quick-action dash-quick-action--${tone}`}>
      <span className={`dash-quick-action__icon dash-quick-action__icon--${tone}`} aria-hidden>
        {icon}
      </span>
      <span className="dash-quick-action__body">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <IconArrowLeft size={16} className="dash-quick-action__arrow" aria-hidden />
    </Link>
  );
}
