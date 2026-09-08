type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="page-skeleton">
      <Skeleton className="page-skeleton__title" />
      <Skeleton className="page-skeleton__subtitle" />
      <div className="page-skeleton__grid">
        <Skeleton className="page-skeleton__card" />
        <Skeleton className="page-skeleton__card" />
        <Skeleton className="page-skeleton__card" />
        <Skeleton className="page-skeleton__card" />
      </div>
      <Skeleton className="page-skeleton__table" />
    </div>
  );
}
