import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  approveProvider,
  deleteProvider,
  fetchAdminProvider,
  renewProviderSubscription,
  suspendProvider,
  updateProviderSubscription,
} from '../api/adminService';
import { ApiError } from '../api/client';
import { useToast } from '../feedback/ToastProvider';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { WhatsAppModal } from '../components/WhatsAppModal';
import { ContactInformation } from '../components/providers/ContactInformation';
import { PhotoGallery } from '../components/providers/PhotoGallery';
import { ProfileTabs } from '../components/providers/ProfileTabs';
import { ProviderOverviewCard } from '../components/providers/ProviderOverviewCard';
import { ProviderProfileHero } from '../components/providers/ProviderProfileHero';
import { SubscriptionPanel } from '../components/providers/SubscriptionPanel';
import { ImageLightbox } from '../components/ui/ImageLightbox';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import { useSetPageBreadcrumbs } from '../navigation/PageBreadcrumbContext';
import type { ProviderProfile } from '../types';

type ProviderSection = 'subscription' | 'gallery' | 'contact';

export function ProviderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fetchProvider = useCallback(
    (options?: { force?: boolean }) => fetchAdminProvider(id!, options),
    [id],
  );
  const {
    data: provider,
    setData: setProvider,
    loading,
    error,
    setError,
    refresh,
  } = useStaleResource<ProviderProfile | null>(
    id ? `admin:provider:${id}` : 'admin:provider:pending',
    fetchProvider,
    {
      snapshotKey: id ? `provider-${id}` : undefined,
      initialData: null,
      enabled: Boolean(id),
      syncTopics: 'providers',
    },
  );
  const [confirm, setConfirm] = useState<'delete' | 'deactivate' | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<ProviderSection>('subscription');

  useRefreshOnFocus(() => {
    if (!id) return;
    void refresh({ silent: true, force: false });
  });

  const pageBreadcrumbs = useMemo(
    () =>
      provider
        ? [
            { label: 'مزودو الخدمات', to: '/providers' },
            { label: provider.fullName },
          ]
        : [{ label: 'مزودو الخدمات', to: '/providers' }, { label: '...' }],
    [provider],
  );

  useSetPageBreadcrumbs(pageBreadcrumbs);

  const runAction = async (action: () => Promise<void>, successMessage?: string) => {
    setBusy(true);

    try {
      await action();
      if (successMessage) toast.success(successMessage);
    } catch (actionFailure) {
      toast.error(
        actionFailure instanceof ApiError
          ? actionFailure.message
          : actionFailure instanceof Error
            ? actionFailure.message
            : 'تعذر تنفيذ العملية.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleActivate = () =>
    void runAction(async () => {
      if (!provider) return;
      setProvider(await approveProvider(provider.id));
    }, 'تم تفعيل الحساب.');

  const handleDeactivate = () =>
    void runAction(async () => {
      if (!provider) return;
      setProvider(await suspendProvider(provider.id));
      setConfirm(null);
    }, 'تم تعطيل الحساب.');

  const handleDelete = () =>
    void runAction(async () => {
      if (!provider) return;
      await deleteProvider(provider.id);
      setConfirm(null);
      navigate('/providers', { replace: true });
    }, 'تم حذف المزود.');

  const handleRenew = () =>
    void runAction(async () => {
      if (!provider) return;
      setProvider(await renewProviderSubscription(provider.id));
    }, 'تم تجديد الاشتراك.');

  const handleToggleFeatured = () => {
    if (!provider) return;
    const previous = provider.isFeatured;
    setProvider({ ...provider, isFeatured: !previous });
    void runAction(async () => {
      try {
        setProvider(await updateProviderSubscription(provider.id, !previous));
      } catch (toggleError) {
        setProvider({ ...provider, isFeatured: previous });
        throw toggleError;
      }
    });
  };

  if (loading) return <LoadingState skeleton label="جاري تحميل بيانات المزود..." />;
  if (error && !provider) return <div className="alert alert-error">{error}</div>;
  if (!provider) {
    return (
      <EmptyState
        title="مقدم الخدمة غير موجود"
        description="تعذر العثور على هذا المزود."
      />
    );
  }

  const primaryAction =
    provider.status !== 'ACTIVE'
      ? { label: 'تفعيل', onClick: handleActivate }
      : { label: 'تعطيل', onClick: () => setConfirm('deactivate') };

  const overflowItems = [
    ...(provider.isSubscriptionExpired || provider.needsSubscriptionRenewal
      ? [{ key: 'renew', label: 'تجديد الاشتراك', onClick: handleRenew }]
      : []),
    ...(provider.phone
      ? [{ key: 'whatsapp', label: 'فتح واتساب', onClick: () => setWhatsappOpen(true) }]
      : []),
    ...(provider.status === 'ACTIVE'
      ? [{
          key: 'featured',
          label: provider.isFeatured ? 'إلغاء التمييز' : 'تمييز',
          onClick: handleToggleFeatured,
        }]
      : []),
    { key: 'delete', label: 'حذف', danger: true, onClick: () => setConfirm('delete') },
  ];

  const showRenewAction =
    provider.isSubscriptionExpired || provider.needsSubscriptionRenewal;

  return (
    <div className="mgmt-page">
      <div className="provider-profile-stack">
        {error ? <div className="alert alert-error">{error}</div> : null}

        <ProviderProfileHero
          provider={provider}
          busy={busy}
          primaryAction={primaryAction}
          overflowItems={overflowItems}
          onPhotoClick={() => provider.photoUrl && setLightboxImage(provider.photoUrl)}
        />

        <ProviderOverviewCard bio={provider.bio} subServices={provider.subServices} />

        <section className="mgmt-table-shell provider-section">
          <div className="provider-section__tabs">
            <ProfileTabs
              items={[
                { key: 'subscription' as const, label: 'الاشتراك' },
                {
                  key: 'gallery' as const,
                  label: 'ألبوم الصور',
                  badge: provider.galleryItems.length || undefined,
                },
                { key: 'contact' as const, label: 'التواصل' },
              ]}
              value={activeSection}
              onChange={setActiveSection}
            />
          </div>

          <div className="provider-section__body" aria-live="polite">
            {activeSection === 'subscription' ? (
              <SubscriptionPanel
                provider={provider}
                busy={busy}
                onRenew={showRenewAction ? handleRenew : undefined}
              />
            ) : null}

            {activeSection === 'gallery' ? (
              <PhotoGallery
                items={provider.galleryItems}
                providerName={provider.fullName}
                onImageClick={setLightboxImage}
              />
            ) : null}

            {activeSection === 'contact' ? <ContactInformation provider={provider} /> : null}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirm === 'delete'}
        title="تأكيد الحذف"
        message="هل أنت متأكد أنك تريد حذف هذا الحساب؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={confirm === 'deactivate'}
        title="تعطيل الحساب"
        message="هل أنت متأكد أنك تريد تعطيل هذا الحساب؟"
        confirmLabel="تعطيل"
        danger
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleDeactivate()}
      />

      <WhatsAppModal
        open={whatsappOpen}
        providerName={provider.fullName}
        phone={provider.phone}
        onClose={() => setWhatsappOpen(false)}
      />

      <ImageLightbox
        open={Boolean(lightboxImage)}
        src={lightboxImage || undefined}
        title={provider.fullName}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
