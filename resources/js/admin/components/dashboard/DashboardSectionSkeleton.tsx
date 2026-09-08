import { Skeleton } from '../feedback/Skeleton';

type DashboardSectionSkeletonProps = {
  variant?: 'kpi' | 'panel' | 'table';
};

export function DashboardSectionSkeleton({ variant = 'panel' }: DashboardSectionSkeletonProps) {
  if (variant === 'kpi') {
    return (
      <div className="dash-section-skeleton dash-section-skeleton--kpi">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="dash-section-skeleton__kpi-card" />
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return <Skeleton className="dash-section-skeleton__table" />;
  }

  return <Skeleton className="dash-section-skeleton__panel" />;
}
