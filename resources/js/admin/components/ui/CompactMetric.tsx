import type { ReactNode } from 'react';

type CompactMetricProps = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

const toneClass = {
  default: '',
  success: 'ui-metric--success',
  warning: 'ui-metric--warning',
  danger: 'ui-metric--danger',
  info: 'ui-metric--info',
};

export function CompactMetric({ label, value, tone = 'default' }: CompactMetricProps) {
  return (
    <div className={`ui-metric ${toneClass[tone]}`.trim()}>
      <span className="ui-metric__label">{label}</span>
      <span className="ui-metric__value">{value}</span>
    </div>
  );
}
