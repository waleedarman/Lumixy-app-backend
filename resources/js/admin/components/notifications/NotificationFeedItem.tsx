import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import {
  formatNotificationListTime,
  formatNotificationTime,
  getNotificationPresentation,
} from '../../utils/notificationPresentation';
import type { RemoteNotification } from '../../types';

type NotificationFeedItemProps = {
  notification: RemoteNotification;
  busy?: boolean;
  onMarkRead?: (id: string) => void;
  compact?: boolean;
};

export function NotificationFeedItem({
  notification,
  busy,
  onMarkRead,
  compact = false,
}: NotificationFeedItemProps) {
  const presentation = getNotificationPresentation(notification);

  return (
    <article
      className={`notify-item ${notification.read ? 'is-read' : 'is-unread'} ${compact ? 'notify-item--compact' : ''}`.trim()}
    >
      <div className="notify-item__row">
        <h3 className="notify-item__title">{notification.title || 'إشعار'}</h3>
        <time
          className="notify-item__time"
          dateTime={notification.created_at}
          title={formatNotificationTime(notification.created_at)}
        >
          {formatNotificationListTime(notification.created_at)}
        </time>
      </div>

      <div className="notify-item__meta">
        <span className={`notify-item__type notify-item__type--${presentation.tone}`}>
          {presentation.label}
        </span>
        {!notification.read ? <span className="notify-item__unread">غير مقروء</span> : null}
      </div>

      <p className="notify-item__message">{notification.message}</p>

      {(presentation.kind === 'new_provider' ||
        presentation.kind === 'expiring_soon' ||
        presentation.kind === 'expired' ||
        (!notification.read && onMarkRead)) ? (
        <div className="notify-item__actions">
          {presentation.kind === 'new_provider' ? (
            <Link to="/providers?filter=pending" className="notify-item__link">
              مراجعة المزودين
            </Link>
          ) : null}
          {presentation.kind === 'expiring_soon' ? (
            <Link to="/providers?filter=expiringSoon" className="notify-item__link">
              عرض الاشتراكات
            </Link>
          ) : null}
          {presentation.kind === 'expired' ? (
            <Link to="/providers?filter=expired" className="notify-item__link">
              المزودون المنتهون
            </Link>
          ) : null}
          {!notification.read && onMarkRead ? (
            <Button
              variant="ghost"
              size="sm"
              loading={busy}
              onClick={() => onMarkRead(notification.id)}
            >
              تعليم كمقروء
            </Button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
