import { PageSkeleton } from './feedback/Skeleton';

type LoadingStateProps = {
  label?: string;
  fullScreen?: boolean;
  skeleton?: boolean;
};

export function LoadingState({
  label = 'جاري التحميل...',
  fullScreen = false,
  skeleton = false,
}: LoadingStateProps) {
  if (skeleton) {
    return (
      <div className={`loading-state ${fullScreen ? 'loading-state--fullscreen' : ''}`}>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className={`loading-state ${fullScreen ? 'loading-state--fullscreen' : ''}`}>
      <div className="loading-spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}
