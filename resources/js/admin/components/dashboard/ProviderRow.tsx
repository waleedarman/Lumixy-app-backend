import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../api/mappers';
import type { ProviderProfile } from '../../types';
import {
  formatDisplayDate,
  getProviderSubscriptionTone,
  getSubscriptionStatusLabel,
} from '../../utils/providerPresentation';
import { isSubscriptionExpiringSoon } from '../../utils/subscription';
import { AdminImage } from '../ui/AdminImage';
import { ActionsMenu } from '../ui/ActionsMenu';
import { StatusBadge } from '../ui/StatusBadge';
import { IconBriefcase, IconCalendarClock, IconMapPin } from '../icons/AdminIcons';

type ProviderRowProps = {
  provider: ProviderProfile;
};

function SubscriptionBadge({ provider }: { provider: ProviderProfile }) {
  if (provider.isSubscriptionExpired) {
    return <span className="dash-sub-badge dash-sub-badge--danger">منتهي</span>;
  }

  if (isSubscriptionExpiringSoon(provider)) {
    return <span className="dash-sub-badge dash-sub-badge--warning">ينتهي قريباً</span>;
  }

  const label = getSubscriptionStatusLabel(provider.subscriptionStatus);
  const tone = getProviderSubscriptionTone(provider);

  return <span className={`dash-sub-badge dash-sub-badge--${tone}`}>{label}</span>;
}

export function ProviderRow({ provider }: ProviderRowProps) {
  const navigate = useNavigate();
  const joinedDate = formatDisplayDate(provider.subscriptionStartedAt);
  const endsDate = formatDisplayDate(provider.subscriptionEndsAt);

  return (
    <tr className={`dash-provider-row${provider.isFeatured ? ' is-featured' : ''}`}>
      <td data-label="المزود">
        <div className={`dash-provider-row__identity${provider.isFeatured ? ' is-featured' : ''}`}>
          <AdminImage
            src={provider.photoUrl}
            alt={provider.fullName}
            className={`dash-provider-row__avatar${provider.isFeatured ? ' is-featured' : ''}`}
            fallback={
              <div className="dash-provider-row__avatar dash-provider-row__avatar--placeholder">
                {provider.fullName.slice(0, 1)}
              </div>
            }
          />
          <div className="dash-provider-row__name-row">
            <strong className="dash-provider-row__name">{provider.fullName}</strong>
            {provider.isFeatured ? (
              <span className="featured-badge">مميز</span>
            ) : null}
          </div>
        </div>
      </td>

      <td data-label="التصنيف والموقع">
        <div className="dash-provider-row__meta">
          <span>
            <IconBriefcase size={14} aria-hidden />
            {provider.categoryName || '—'}
          </span>
          <span>
            <IconMapPin size={14} aria-hidden />
            {provider.city || '—'}
          </span>
        </div>
      </td>

      <td data-label="حالة الحساب">
        <StatusBadge status={provider.status} />
      </td>

      <td data-label="الاشتراك">
        <div className="dash-provider-row__subscription">
          <SubscriptionBadge provider={provider} />
          {endsDate ? (
            <span className="dash-provider-row__sub-date">ينتهي: {endsDate}</span>
          ) : null}
          {!provider.isSubscriptionExpired &&
          typeof provider.subscriptionDaysRemaining === 'number' ? (
            <span
              className={`dash-provider-row__sub-days${
                isSubscriptionExpiringSoon(provider) ? ' is-warning' : ''
              }`}
            >
              {provider.subscriptionDaysRemaining} يوم متبقٍ
            </span>
          ) : null}
        </div>
      </td>

      <td data-label="تاريخ الانضمام">
        <span className="dash-provider-row__date">
          <IconCalendarClock size={14} aria-hidden />
          {joinedDate || formatDate(provider.subscriptionStartedAt) || '—'}
        </span>
      </td>

      <td className="dash-provider-row__actions" data-label="إجراءات">
        <ActionsMenu
          items={[
            {
              key: 'view',
              label: 'عرض التفاصيل',
              onClick: () => navigate(`/providers/${provider.id}`),
            },
            {
              key: 'list',
              label: 'فتح في قائمة المزودين',
              onClick: () => navigate('/providers'),
            },
          ]}
        />
      </td>
    </tr>
  );
}
