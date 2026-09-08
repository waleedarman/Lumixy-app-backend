import { Link } from 'react-router-dom';
import { IconChart, IconRefresh } from '../icons/AdminIcons';
import { IconButton } from '../ui/IconButton';

type DashboardHeaderProps = {
  refreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
};

function formatLastUpdated(date: Date): string {
  return new Intl.DateTimeFormat('ar', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function DashboardHeader({ refreshing, lastUpdated, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="dash-header">
      <div className="dash-header__intro">
        <h1 className="dash-header__title">نظرة عامة</h1>
        <p className="dash-header__subtitle">
          ملخص أداء المنصة والعمليات التي تحتاج إلى متابعة
        </p>
      </div>

      <div className="dash-header__actions">
        {lastUpdated ? (
          <span className="dash-header__updated">
            آخر تحديث: {formatLastUpdated(lastUpdated)}
          </span>
        ) : null}

        <IconButton
          label={refreshing ? 'جاري التحديث' : 'تحديث البيانات'}
          disabled={refreshing}
          onClick={onRefresh}
        >
          <span className={refreshing ? 'ui-spin' : ''} aria-hidden>
            <IconRefresh size={18} />
          </span>
        </IconButton>

        <Link to="/subscriptions" className="btn btn-secondary btn-sm dash-header__reports">
          <IconChart size={16} aria-hidden />
          عرض التقارير
        </Link>
      </div>
    </header>
  );
}
