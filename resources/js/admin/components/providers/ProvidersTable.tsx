import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ManagementTableShell } from '../management/ManagementTableShell';
import { isSubscriptionExpired } from '../../utils/subscription';
import { isExiting } from '../../utils/animatedRemoval';
import type { ProviderProfile } from '../../types';
import { IconMapPin, IconWhatsApp } from '../icons/AdminIcons';
import { AdminImage } from '../ui/AdminImage';
import { ActionsMenu } from '../ui/ActionsMenu';
import { IconButton } from '../ui/IconButton';
import { LtrText } from '../ui/LtrText';
import { StatusBadge } from '../ui/StatusBadge';
import { FeaturedSwitch } from './FeaturedSwitch';
import { SubscriptionCell } from './SubscriptionCell';

import type { TablePaginationConfig } from '../management/ManagementTableShell';

type ProvidersTableProps = {
  providers: ProviderProfile[];
  busyId: string | null;
  exitingIds?: Set<string>;
  pagination?: TablePaginationConfig;
  onToggleFeatured: (provider: ProviderProfile, nextFeatured: boolean) => void;
  onActivate: (id: string) => void;
  onDeactivate: (id: string) => void;
  onRenew: (id: string) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (provider: ProviderProfile) => void;
};

export const ProvidersTable = memo(function ProvidersTable({
  providers,
  busyId,
  exitingIds,
  pagination,
  onToggleFeatured,
  onActivate,
  onDeactivate,
  onRenew,
  onDelete,
  onWhatsApp,
}: ProvidersTableProps) {
  const navigate = useNavigate();

  return (
    <ManagementTableShell pagination={pagination}>
      <table className="mgmt-table providers-table">
          <thead>
            <tr>
              <th>المزود</th>
              <th>التصنيف والموقع</th>
              <th>الحالة</th>
              <th>الاشتراك</th>
              <th>مميز</th>
              <th aria-label="إجراءات" />
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr
                key={provider.id}
                className={`providers-table__row${provider.isFeatured ? ' is-featured' : ''}${exitingIds && isExiting(exitingIds, provider.id) ? ' is-exiting' : ''}`}
                tabIndex={0}
                onClick={() => navigate(`/providers/${provider.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/providers/${provider.id}`);
                  }
                }}
              >
                <td data-label="المزود">
                  <div className={`providers-table__identity${provider.isFeatured ? ' is-featured' : ''}`}>
                    <AdminImage
                      src={provider.photoUrl}
                      alt={provider.fullName}
                      className={`providers-table__avatar${provider.isFeatured ? ' is-featured' : ''}`}
                      fallback={
                        <div className="providers-table__avatar providers-table__avatar--placeholder">
                          {provider.fullName.slice(0, 1)}
                        </div>
                      }
                    />
                    <div>
                      <div className="providers-table__name-row">
                        <strong className="providers-table__name">{provider.fullName || '—'}</strong>
                        {provider.isFeatured ? (
                          <span className="featured-badge">مميز</span>
                        ) : null}
                      </div>
                      {provider.phone ? (
                        <LtrText className="providers-table__phone">{provider.phone}</LtrText>
                      ) : (
                        <span className="providers-table__phone">غير متوفر</span>
                      )}
                    </div>
                  </div>
                </td>

                <td data-label="التصنيف والموقع">
                  <div className="providers-table__meta">
                    <span>{provider.categoryName || '—'}</span>
                    {provider.subServices[0] ? (
                      <span className="providers-table__meta-sub">{provider.subServices[0]}</span>
                    ) : null}
                    <span className="providers-table__location">
                      <IconMapPin size={14} aria-hidden />
                      {provider.city || '—'}
                    </span>
                  </div>
                </td>

                <td data-label="الحالة">
                  <StatusBadge status={provider.status} />
                </td>

                <td data-label="الاشتراك">
                  <SubscriptionCell
                    provider={provider}
                    busy={busyId === provider.id}
                    onRenew={onRenew}
                  />
                </td>

                <td data-label="مميز" onClick={(event) => event.stopPropagation()}>
                  {provider.status === 'ACTIVE' ? (
                    <FeaturedSwitch
                      checked={provider.isFeatured}
                      disabled={busyId === provider.id}
                      label={provider.isFeatured ? 'إلغاء التمييز' : 'تمييز المزود'}
                      onCommit={(nextFeatured) => onToggleFeatured(provider, nextFeatured)}
                    />
                  ) : (
                    <span className="providers-table__muted">—</span>
                  )}
                </td>

                <td
                  className="providers-table__actions"
                  data-label="إجراءات"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="providers-table__actions-row">
                    {provider.phone ? (
                      <IconButton
                        label={`واتساب ${provider.fullName}`}
                        className="providers-table__whatsapp"
                        disabled={busyId === provider.id}
                        onClick={() => onWhatsApp(provider)}
                      >
                        <IconWhatsApp size={20} />
                      </IconButton>
                    ) : null}
                    <ActionsMenu
                      busy={busyId === provider.id}
                      items={[
                        {
                          key: 'view',
                          label: 'عرض التفاصيل',
                          onClick: () => navigate(`/providers/${provider.id}`),
                        },
                        provider.status !== 'ACTIVE'
                          ? {
                              key: 'activate',
                              label: 'تفعيل',
                              onClick: () => onActivate(provider.id),
                            }
                          : {
                              key: 'deactivate',
                              label: 'تعطيل',
                              onClick: () => onDeactivate(provider.id),
                            },
                        ...(isSubscriptionExpired(provider)
                          ? [{
                              key: 'renew',
                              label: 'تجديد الاشتراك',
                              onClick: () => onRenew(provider.id),
                            }]
                          : []),
                        ...(provider.status === 'ACTIVE'
                          ? [{
                              key: 'featured',
                              label: provider.isFeatured ? 'إلغاء التمييز' : 'تمييز',
                              onClick: () => onToggleFeatured(provider, !provider.isFeatured),
                            }]
                          : []),
                        {
                          key: 'delete',
                          label: 'حذف',
                          danger: true,
                          onClick: () => onDelete(provider.id),
                        },
                      ]}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </ManagementTableShell>
  );
});
