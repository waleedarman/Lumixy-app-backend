import { Button } from '../ui/Button';
import type { ProviderProfile } from '../../types';
import {
  getProviderSubscriptionTone,
  getSubscriptionPlanLabel,
  getSubscriptionStatusLabel,
  getSubscriptionSummaryMessage,
  hasActiveSubscription,
} from '../../utils/providerPresentation';

type SubscriptionSummaryProps = {
  provider: ProviderProfile;
  busy: boolean;
  onRenew?: () => void;
};

export function SubscriptionSummary({ provider, busy, onRenew }: SubscriptionSummaryProps) {
  const statusLabel = getSubscriptionStatusLabel(provider.subscriptionStatus);
  const planLabel = getSubscriptionPlanLabel(provider);
  const tone = getProviderSubscriptionTone(provider);
  const message = getSubscriptionSummaryMessage(provider);
  const showRenew =
    Boolean(onRenew) &&
    (provider.isSubscriptionExpired || provider.needsSubscriptionRenewal);

  if (!hasActiveSubscription(provider)) {
    return (
      <div className="subscription-empty">
        <h3 className="subscription-empty__title">لا يوجد اشتراك فعّال</h3>
        <p className="subscription-empty__desc">{message}</p>
        {showRenew ? (
          <Button variant="primary" size="sm" loading={busy} onClick={onRenew}>
            تجديد الاشتراك
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`subscription-summary subscription-summary--${tone}`}>
      <div className="subscription-summary__head">
        <span className={`subscription-summary__badge subscription-summary__badge--${tone}`}>
          {statusLabel}
        </span>
        {planLabel ? <span className="subscription-summary__plan">{planLabel}</span> : null}
      </div>
      <p className="subscription-summary__message">{message}</p>
      {showRenew ? (
        <Button variant="secondary" size="sm" loading={busy} onClick={onRenew}>
          تجديد الاشتراك
        </Button>
      ) : null}
    </div>
  );
}
