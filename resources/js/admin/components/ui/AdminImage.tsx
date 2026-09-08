import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type AdminImageProps = {
  src?: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
};

export function AdminImage({ src, alt, className = '', fallback }: AdminImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <div className={`admin-image-fallback ${className}`.trim()} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
