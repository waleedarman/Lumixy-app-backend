import { Link } from 'react-router-dom';
import { IconArrowLeft } from '../icons/AdminIcons';

type StatusSegment = {
  key: string;
  label: string;
  value: number;
};

const SEGMENT_COLORS: Record<string, string> = {
  active: 'var(--chart-active)',
  pending: 'var(--chart-pending)',
  deactivated: 'var(--chart-inactive)',
};

type ProviderStatusOverviewProps = {
  segments: StatusSegment[];
};

export function ProviderStatusOverview({ segments }: ProviderStatusOverviewProps) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const cx = 80;
  const cy = 80;
  const radius = 58;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const arcs = segments
    .filter((item) => item.value > 0)
    .map((item) => {
      const fraction = total > 0 ? item.value / total : 0;
      const dash = fraction * circumference;
      const offset = cumulative;
      cumulative += dash;

      return {
        ...item,
        dash,
        offset,
        percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
      };
    });

  return (
    <article className="dash-panel dash-panel--analytics">
      <header className="dash-panel__header">
        <div>
          <h2 className="dash-panel__title">حالة مزودي الخدمات</h2>
          <p className="dash-panel__subtitle">
            توزيع الحسابات حسب حالة المراجعة والتفعيل الحالية
          </p>
        </div>
        <Link to="/subscriptions" className="dash-panel__link">
          عرض الإحصائيات
          <IconArrowLeft size={14} aria-hidden />
        </Link>
      </header>

      {total === 0 ? (
        <p className="dash-panel__empty">لا توجد بيانات مزودين لعرضها.</p>
      ) : (
        <div className="dash-status-chart">
          <div className="dash-status-chart__visual" aria-hidden>
            <svg viewBox="0 0 160 160" className="dash-donut">
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="var(--chart-track)"
                strokeWidth={stroke}
              />
              {arcs.map((item) => (
                <circle
                  key={item.key}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={SEGMENT_COLORS[item.key] ?? 'var(--chart-inactive)'}
                  strokeWidth={stroke}
                  strokeDasharray={`${item.dash} ${circumference - item.dash}`}
                  strokeDashoffset={circumference / 4 - item.offset}
                  strokeLinecap="butt"
                />
              ))}
              <text x={cx} y={cy - 4} textAnchor="middle" className="dash-donut__total">
                {total.toLocaleString('ar')}
              </text>
              <text x={cx} y={cy + 16} textAnchor="middle" className="dash-donut__label">
                مزود
              </text>
            </svg>
          </div>

          <ul className="dash-status-chart__legend">
            {segments.map((item) => {
              const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
              return (
                <li key={item.key} className="dash-legend-item">
                  <span
                    className={`dash-legend-item__dot dash-legend-item__dot--${item.key}`}
                    aria-hidden
                  />
                  <span className="dash-legend-item__label">{item.label}</span>
                  <span className="dash-legend-item__value">{item.value.toLocaleString('ar')}</span>
                  <span className="dash-legend-item__percent">{percent}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </article>
  );
}
