import type { AdminAccount } from '../../types';
import { LtrText } from '../ui/LtrText';
import { StatusBadge } from '../ui/StatusBadge';

type AccountIdentityHeaderProps = {
  admin: AdminAccount | null;
  isSuperAdmin: boolean;
};

export function AccountIdentityHeader({ admin, isSuperAdmin }: AccountIdentityHeaderProps) {
  if (!admin) {
    return null;
  }

  const initial = admin.full_name.trim().slice(0, 1).toUpperCase() || 'L';

  return (
    <div className="account-identity" aria-label="ملخص الحساب">
      <div className="account-identity__avatar" aria-hidden>
        {initial}
      </div>
      <div className="account-identity__body">
        <h2 className="account-identity__name">{admin.full_name}</h2>
        <p className="account-identity__email">
          <LtrText>{admin.email}</LtrText>
        </p>
      </div>
      <div className="account-identity__meta">
        <span className={`account-identity__role${isSuperAdmin ? ' account-identity__role--super' : ''}`}>
          {isSuperAdmin ? 'مشرف عام' : 'مشرف'}
        </span>
        <StatusBadge status={admin.status} />
      </div>
    </div>
  );
}
