import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deletePromotion,
  duplicatePromotion,
  fetchAdminPromotions,
  reorderPromotions,
  togglePromotion,
} from '../api/promotionService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { ManagementToolbar } from '../components/management/ManagementToolbar';
import { PromotionPreviewCard } from '../components/promotions/PromotionPreviewCard';
import { PromotionsTable } from '../components/promotions/PromotionsTable';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../feedback/ToastProvider';
import { useAdminSync } from '../hooks/useAdminSync';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import type { AppPromotion } from '../types';
import { animateListRemoval } from '../utils/animatedRemoval';

export function PromotionsPage() {
  const navigate = useNavigate();
  const {
    data: promotions,
    setData: setPromotions,
    loading,
    refresh,
  } = useStaleResource('admin:promotions', fetchAdminPromotions, {
    snapshotKey: 'promotions',
    initialData: [] as AppPromotion[],
    syncTopics: 'promotions',
  });

  const [search, setSearch] = useState('');
  const [previewPromotion, setPreviewPromotion] = useState<AppPromotion | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const toast = useToast();

  useRefreshOnFocus(() => void refresh({ silent: true }));
  useAdminSync('promotions', () => void refresh({ silent: true, force: true }));

  const filteredPromotions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return promotions;
    return promotions.filter((promotion) =>
      [promotion.title, promotion.description, promotion.buttonText]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [promotions, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const targetId = deleteId;
    setBusy(true);
    try {
      await animateListRemoval(
        targetId,
        setExitingIds,
        () => deletePromotion(targetId),
        () => setPromotions((current) => current.filter((item) => item.id !== targetId)),
      );
      toast.success('تم حذف الإعلان.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الإعلان.');
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  const handleToggle = async (id: string) => {
    setBusyId(id);
    try {
      const updated = await togglePromotion(id);
      setPromotions((current) => current.map((item) => (item.id === id ? updated : item)));
      toast.success(updated.isActive ? 'تم تفعيل الإعلان.' : 'تم تعطيل الإعلان.');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'تعذر تحديث حالة الإعلان.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    try {
      const copy = await duplicatePromotion(id);
      setPromotions((current) => [...current, copy].sort((a, b) => a.displayOrder - b.displayOrder));
      toast.success('تم نسخ الإعلان.');
    } catch (duplicateError) {
      toast.error(duplicateError instanceof Error ? duplicateError.message : 'تعذر نسخ الإعلان.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDragEnd = async () => {
    if (!draggingId || !dragOverId || draggingId === dragOverId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const current = [...promotions];
    const fromIndex = current.findIndex((item) => item.id === draggingId);
    const toIndex = current.findIndex((item) => item.id === dragOverId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const reordered = [...current];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setPromotions(reordered);
    setDraggingId(null);
    setDragOverId(null);

    try {
      const synced = await reorderPromotions(reordered.map((item) => item.id));
      setPromotions(synced);
      toast.success('تم تحديث ترتيب الإعلانات.');
    } catch (reorderError) {
      toast.error(reorderError instanceof Error ? reorderError.message : 'تعذر تحديث الترتيب.');
      void refresh({ force: true });
    }
  };

  if (loading) {
    return <LoadingState skeleton label="جاري تحميل الإعلانات..." />;
  }

  return (
    <div className="mgmt-page">
      <ManagementPageHeader
        title="إدارة الإعلانات"
        subtitle="تحكم بإعلانات الصفحة الرئيسية، جدولتها، ترتيبها، وروابطها."
        actions={<Button onClick={() => navigate('/promotions/new')}>إضافة إعلان</Button>}
      />

      <ManagementToolbar search={search} onSearchChange={setSearch} searchPlaceholder="ابحث في الإعلانات..." />

      {filteredPromotions.length === 0 ? (
        <EmptyState title="لا توجد إعلانات" description="أنشئ أول إعلان ليظهر في الصفحة الرئيسية للتطبيق." />
      ) : (
        <PromotionsTable
          promotions={filteredPromotions}
          exitingIds={exitingIds}
          busyId={busyId}
          draggingId={draggingId}
          dragOverId={dragOverId}
          onDragStart={setDraggingId}
          onDragOver={setDragOverId}
          onDragEnd={() => void handleDragEnd()}
          onPreview={setPreviewPromotion}
          onEdit={(promotion) => navigate(`/promotions/${promotion.id}/edit`)}
          onToggle={(id) => void handleToggle(id)}
          onDuplicate={(id) => void handleDuplicate(id)}
          onDelete={setDeleteId}
        />
      )}

      <Modal
        open={Boolean(previewPromotion)}
        title="معاينة الإعلان"
        onClose={() => setPreviewPromotion(null)}
      >
        {previewPromotion ? (
          <>
            {previewPromotion.showSectionTitle ? (
              <div className="promotions-page__section-head">
                <strong>إعلانات مميزة</strong>
                {previewPromotion.showSponsoredBadge ? (
                  <span className="promotions-page__sponsored">مموّل</span>
                ) : null}
              </div>
            ) : null}
            <PromotionPreviewCard promotion={previewPromotion} />
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="حذف الإعلان"
        message="هل أنت متأكد من حذف هذا الإعلان؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
        danger
        loading={busy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
