import { memo } from 'react';
import { formatDate } from '../../api/mappers';
import type { ProviderProfile } from '../../types';
import {
  getProviderSubscriptionTone,
  getSubscriptionStatusLabel,
} from '../../utils/providerPresentation';
import { isSubscriptionExpired, isSubscriptionExpiringSoon } from '../../utils/subscription';
import { IconRefresh } from '../icons/AdminIcons';

type SubscriptionCellProps = {
  provider: ProviderProfile;
  busy?: boolean;
  onRenew?: (id: string) => void;
};

function getBadgeLabel(provider: ProviderProfile): string {
  if (isSubscriptionExpired(provider)) return 'منتهي';
  if (isSubscriptionExpiringSoon(provider)) return 'ينتهي قريباً';
  return getSubscriptionStatusLabel(provider.subscriptionStatus);
}

function getDateLabel(provider: ProviderProfile): string | null {
  const formatted = formatDate(provider.subscriptionEndsAt);
  if (!formatted || formatted === '—') return null;
  return isSubscriptionExpired(provider) ? `انتهى: ${formatted}` : `ينتهي: ${formatted}`;
}

export const SubscriptionCell = memo(function SubscriptionCell({
  provider,
  busy = false,
  onRenew,
}: SubscriptionCellProps) {
  const expired = isSubscriptionExpired(provider);
  const tone = getProviderSubscriptionTone(provider);
  const badgeLabel = getBadgeLabel(provider);
  const dateLabel = getDateLabel(provider);
  const daysRemaining =
    typeof provider.subscriptionDaysRemaining === 'number'
      ? `${provider.subscriptionDaysRemaining} يوم متبقٍ`
      : null;

  if (expired) {
    return (
      <div className="providers-table__subscription" onClick={(event) => event.stopPropagation()}>
        {dateLabel ? (
          <span className="providers-table__sub-date providers-table__sub-date--expired">
            {dateLabel}
          </span>
        ) : null}
        <div className="providers-table__expired-chip">
          <span className="providers-table__sub-badge is-danger">{badgeLabel}</span>
          {onRenew ? (
            <button
              type="button"
              className={`providers-table__renew-btn${busy ? ' is-loading' : ''}`}
              disabled={busy}
              aria-label="تجديد الاشتراك"
              title="تجديد الاشتراك"
              onClick={() => onRenew(provider.id)}
            >
              <IconRefresh size={16} aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="providers-table__subscription">
      <span className={`providers-table__sub-badge is-${tone}`}>{badgeLabel}</span>
      {dateLabel ? (
        <span className={`providers-table__sub-date providers-table__sub-date--${tone}`}>
          {dateLabel}
        </span>
      ) : null}
      {daysRemaining ? (
        <span
          className={`providers-table__sub-days${
            isSubscriptionExpiringSoon(provider) ? ' is-warning' : ''
          }`}
        >
          {daysRemaining}
        </span>
      ) : null}
    </div>
  );
});
