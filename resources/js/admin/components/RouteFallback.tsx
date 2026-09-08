import { Skeleton } from './feedback/Skeleton';

export function RouteFallback() {
  return (
    <div className="route-fallback" aria-busy="true" aria-label="جاري تحميل الصفحة">
      <Skeleton className="route-fallback__title" />
      <Skeleton className="route-fallback__toolbar" />
      <Skeleton className="route-fallback__body" />
    </div>
  );
}

export function AuthRouteFallback() {
  return (
    <div className="auth-route-fallback" aria-busy="true" aria-label="جاري التحميل">
      <div className="loading-spinner" aria-hidden />
    </div>
  );
}
