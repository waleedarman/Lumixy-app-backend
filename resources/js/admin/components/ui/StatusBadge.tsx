import { statusLabel } from '../../api/mappers';
import type { ProviderStatus } from '../../types';

type StatusBadgeProps = {
  status: ProviderStatus | 'active' | 'inactive';
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized =
    status === 'active' ? 'ACTIVE' : status === 'inactive' ? 'DEACTIVATED' : status;

  return (
    <span className={`badge badge-${normalized.toLowerCase()}`}>
      {status === 'active' ? 'نشط' : status === 'inactive' ? 'غير نشط' : statusLabel(normalized)}
    </span>
  );
}
