import { AdminImage } from '../ui/AdminImage';
import { ActionsMenu } from '../ui/ActionsMenu';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import type { ProviderProfile } from '../../types';

type ProviderProfileHeroProps = {
  provider: ProviderProfile;
  busy: boolean;
  primaryAction: { label: string; onClick: () => void };
  overflowItems: Array<{
    key: string;
    label: string;
    danger?: boolean;
    onClick: () => void;
  }>;
  onPhotoClick?: () => void;
};

export function ProviderProfileHero({
  provider,
  busy,
  primaryAction,
  overflowItems,
  onPhotoClick,
}: ProviderProfileHeroProps) {
  const meta = [provider.categoryName, provider.city].filter(Boolean).join(' · ');
  const avatarClass = `entity-header__avatar${provider.isFeatured ? ' is-featured' : ''}`;

  const avatar = (
    <AdminImage
      src={provider.photoUrl}
      alt={provider.fullName}
      className={avatarClass}
      fallback={
        <div className={`${avatarClass} entity-header__avatar--placeholder`}>
          {provider.fullName.slice(0, 1)}
        </div>
      }
    />
  );

  return (
    <header
      className={`entity-header provider-header${provider.isFeatured ? ' is-featured' : ''}`}
    >
      <div className="entity-header__main">
        {onPhotoClick && provider.photoUrl ? (
          <button
            type="button"
            className="provider-header__avatar-btn"
            aria-label={`عرض صورة ${provider.fullName}`}
            onClick={onPhotoClick}
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}

        <div className="entity-header__info">
          <h1 className="entity-header__name">{provider.fullName}</h1>
          {meta ? <p className="entity-header__meta">{meta}</p> : null}
          <div className="entity-header__badges">
            <StatusBadge status={provider.status} />
            {provider.isFeatured ? (
              <span className="featured-badge">مميز</span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="entity-header__actions">
        <Button variant="primary" size="sm" loading={busy} onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
        <ActionsMenu busy={busy} items={overflowItems} />
      </div>
    </header>
  );
}
