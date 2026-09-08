import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { sendAdminBroadcast } from '../api/adminService';
import { useToast } from '../feedback/ToastProvider';
import { fetchRemoteNotifications, markRemoteNotificationRead, clearRemoteNotifications } from '../api/notificationService';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { ManagementTableShell } from '../components/management/ManagementTableShell';
import { SegmentedTabs } from '../components/management/SegmentedTabs';
import { NotificationFeedItem } from '../components/notifications/NotificationFeedItem';
import { IconMegaphone, IconSend, IconUsers } from '../components/icons/AdminIcons';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { FormField } from '../components/ui/FormField';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import { filterAdminNotifications } from '../utils/notifications';
import {
  getNotificationPresentation,
} from '../utils/notificationPresentation';
import type { RemoteNotification } from '../types';

type NotificationTab = 'history' | 'compose';

const TARGET_OPTIONS = [
  { key: 'all' as const, label: 'الجميع', hint: 'مزودون + مشرفون', icon: IconUsers },
  { key: 'providers' as const, label: 'المزودون', hint: 'كل المزودين النشطين', icon: IconUsers },
  { key: 'admins' as const, label: 'المشرفون', hint: 'فريق الإدارة', icon: IconMegaphone },
];

export function NotificationsPage() {
  const { admin } = useAuth();
  const notificationScope = admin?.id ?? 'default';
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<NotificationTab>(
    searchParams.get('tab') === 'compose' ? 'compose' : 'history',
  );
  const markedReadRef = useRef(false);
  const fetchNotifications = useCallback(
    (options?: { force?: boolean }) => fetchRemoteNotifications(notificationScope, options),
    [notificationScope],
  );
  const {
    data: notifications,
    setData: setNotifications,
    loading,
    error,
    setError,
    refresh,
  } = useStaleResource(`admin:notifications:list:${notificationScope}`, fetchNotifications, {
    snapshotKey: `notifications-${notificationScope}`,
    initialData: [] as RemoteNotification[],
    syncTopics: 'notifications',
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'providers' | 'admins'>('all');
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const toast = useToast();

  const loadNotifications = useCallback(
    async (silent = false, force = false) => {
      await refresh({ silent, force });
    },
    [refresh],
  );

  useEffect(() => {
    if (markedReadRef.current || !admin?.id || loading) return;

    markedReadRef.current = true;
    void (async () => {
      try {
        const filtered = filterAdminNotifications(notifications, admin.id);
        const unread = filtered.filter((item) => !item.read);
        if (unread.length === 0) return;

        await Promise.all(unread.map((item) => markRemoteNotificationRead(item.id).catch(() => null)));
        await refresh({ silent: true, force: true });
      } catch {
        // Keep cached list visible if background sync fails.
      }
    })();
  }, [admin?.id, loading, notifications, refresh]);

  useRefreshOnFocus(() => {
    void loadNotifications(true, false);
  });

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === 'compose') next.set('tab', 'compose');
      else next.delete('tab');
      return next;
    }, { replace: true });
  }, [tab, setSearchParams]);

  const filtered = useMemo(
    () => filterAdminNotifications(notifications, admin?.id),
    [notifications, admin?.id],
  );

  const sortedNotifications = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [filtered],
  );

  const unreadCount = sortedNotifications.filter((item) => !item.read).length;

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      await markRemoteNotificationRead(id);
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item)),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleClearAll = async () => {
    setBusyId('clear');

    try {
      await clearRemoteNotifications();
      setNotifications([]);
      setConfirmClear(false);
      toast.success('تم مسح جميع الإشعارات.');
    } catch (clearError) {
      toast.error(clearError instanceof Error ? clearError.message : 'تعذر مسح الإشعارات.');
    } finally {
      setBusyId(null);
    }
  };

  const handleBroadcast = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = broadcastMessage.trim();
    if (!message) {
      toast.warning('اكتب الرسالة التي تريد إرسالها أولاً.');
      return;
    }

    setBusyId('broadcast');

    try {
      const response = await sendAdminBroadcast({
        title: broadcastTitle.trim() || undefined,
        message,
        target: broadcastTarget,
      });
      toast.success(`${response.message} (تم الإرسال: ${response.result.sent})`);
      setBroadcastMessage('');
      setBroadcastTitle('');
      setConfirmSend(false);
      setTab('history');
      await loadNotifications(false);
    } catch (broadcastError) {
      toast.error(
        broadcastError instanceof Error ? broadcastError.message : 'فشل إرسال الإشعار الجماعي.',
      );
    } finally {
      setBusyId(null);
    }
  };

  const previewPresentation = getNotificationPresentation({
    id: 'preview',
    user_id: 'admin',
    type: 'general',
    title: broadcastTitle.trim() || 'رسالة من الإدارة',
    message: broadcastMessage.trim() || 'اكتب نص الإشعار لمعاينة شكله قبل الإرسال.',
    created_at: new Date().toISOString(),
    read: false,
  });

  if (loading) return <LoadingState skeleton label="جاري تحميل مركز الإشعارات..." />;

  return (
    <div className="mgmt-page notify-hub">
      <ManagementPageHeader
        title="مركز الإشعارات"
        subtitle="متابعة التسجيلات الجديدة، تنبيهات الاشتراك، والإشعارات الجماعية."
        actions={
          tab === 'history' && filtered.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              loading={busyId === 'clear'}
              onClick={() => setConfirmClear(true)}
            >
              مسح الإشعارات
            </Button>
          ) : null
        }
      />

      <SegmentedTabs
        ariaLabel="أقسام مركز الإشعارات"
        value={tab}
        onChange={setTab}
        items={[
          { key: 'history' as const, label: 'سجل الإشعارات', count: unreadCount },
          { key: 'compose' as const, label: 'إرسال جماعي' },
        ]}
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      {tab === 'history' ? (
        filtered.length === 0 ? (
          <EmptyState
            icon="bell"
            title="لا توجد إشعارات"
            description="ستظهر هنا تنبيهات التسجيل والاشتراك والرسائل الجماعية."
          />
        ) : (
          <ManagementTableShell className="notify-list-shell">
            <div className="notify-list">
              {sortedNotifications.map((notification) => (
                <NotificationFeedItem
                  key={notification.id}
                  notification={notification}
                  busy={busyId === notification.id}
                  onMarkRead={(id) => void handleMarkRead(id)}
                />
              ))}
            </div>
          </ManagementTableShell>
        )
      ) : (
        <section className="notify-compose">
          <div className="notify-compose__panel mgmt-panel">
            <div className="notify-compose__panel-header">
              <div>
                <h2>إنشاء إشعار جماعي</h2>
                <p>اختر الجمهور، اكتب الرسالة، وارسل تنبيهاً موحداً لكل المستخدمين المستهدفين.</p>
              </div>
            </div>

            <form
              className="notify-compose__form"
              onSubmit={(event) => {
                event.preventDefault();
                setConfirmSend(true);
              }}
            >
              <div className="notify-compose__targets">
                {TARGET_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = broadcastTarget === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`notify-target ${active ? 'is-active' : ''}`.trim()}
                      onClick={() => setBroadcastTarget(option.key)}
                    >
                      <span className="notify-target__icon">
                        <Icon size={18} />
                      </span>
                      <span className="notify-target__copy">
                        <strong>{option.label}</strong>
                        <small>{option.hint}</small>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="form-grid form-grid--2">
                <FormField
                  label="عنوان الإشعار"
                  value={broadcastTitle}
                  onChange={(event) => setBroadcastTitle(event.target.value)}
                  placeholder="مثال: تحديث مهم على Lumixy"
                />

                <div className="form-span-2">
                  <FormField
                    as="textarea"
                    label="نص الرسالة"
                    rows={6}
                    value={broadcastMessage}
                    onChange={(event) => setBroadcastMessage(event.target.value)}
                    placeholder="اكتب رسالة واضحة ومختصرة..."
                    required
                  />
                  <div className="notify-compose__counter">
                    {broadcastMessage.trim().length} / 1000 حرف
                  </div>
                </div>
              </div>

              <div className="notify-compose__actions">
                <Button
                  type="submit"
                  variant="primary"
                  loading={busyId === 'broadcast'}
                  icon={<IconSend size={16} />}
                >
                  {busyId === 'broadcast' ? 'جارٍ الإرسال...' : 'إرسال الإشعار'}
                </Button>
              </div>
            </form>
          </div>

          <aside className="notify-compose__preview mgmt-panel">
            <div className="notify-compose__preview-header">
              <h3>معاينة الإشعار</h3>
              <p>هكذا سيظهر التنبيه للمستخدمين</p>
            </div>

            <div className="notify-compose__preview-stage">
              <NotificationFeedItem
                compact
                notification={{
                  id: 'preview',
                  user_id: 'admin',
                  type: 'general',
                  title: broadcastTitle.trim() || 'رسالة من الإدارة',
                  message: broadcastMessage.trim() || 'اكتب نص الإشعار لمعاينة شكله قبل الإرسال.',
                  created_at: new Date().toISOString(),
                  read: false,
                }}
              />
            </div>

            <div className={`notify-preview-meta notify-preview-meta--${previewPresentation.tone}`}>
              <previewPresentation.icon size={16} />
              <span>{previewPresentation.label}</span>
              <strong>
                {broadcastTarget === 'all'
                  ? 'يُرسل للجميع'
                  : broadcastTarget === 'providers'
                    ? 'يُرسل للمزودين'
                    : 'يُرسل للمشرفين'}
              </strong>
            </div>
          </aside>
        </section>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="مسح الإشعارات"
        message="هل تريد حذف جميع الإشعارات من سجلك؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="مسح الكل"
        loading={busyId === 'clear'}
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => void handleClearAll()}
      />

      <ConfirmDialog
        open={confirmSend}
        title="تأكيد الإرسال"
        message={`هل أنت متأكد من إرسال هذا الإشعار إلى ${
          broadcastTarget === 'all' ? 'الجميع' : broadcastTarget === 'providers' ? 'المزودين' : 'المشرفين'
        }؟`}
        confirmLabel="إرسال"
        loading={busyId === 'broadcast'}
        onCancel={() => setConfirmSend(false)}
        onConfirm={() => void handleBroadcast()}
      />
    </div>
  );
}
