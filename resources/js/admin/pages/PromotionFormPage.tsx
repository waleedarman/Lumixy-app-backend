import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchAdminCategories, fetchAdminProviders } from '../api/adminService';
import {
  createPromotion,
  fetchAdminPromotions,
  updatePromotion,
  type PromotionFormPayload,
} from '../api/promotionService';
import { PromotionForm } from '../components/promotions/PromotionForm';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/LoadingState';
import { useToast } from '../feedback/ToastProvider';
import { useStaleResource } from '../hooks/useStaleResource';
import { useSetPageBreadcrumbs } from '../navigation/PageBreadcrumbContext';
import type { AppCategory, ProviderProfile } from '../types';

export function PromotionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const {
    data: promotions,
    loading: promotionsLoading,
  } = useStaleResource('admin:promotions', fetchAdminPromotions, {
    snapshotKey: 'promotions',
    initialData: [],
    syncTopics: 'promotions',
  });

  const promotion = useMemo(
    () => (isEdit ? promotions.find((item) => item.id === id) ?? null : null),
    [promotions, id, isEdit],
  );

  const pageBreadcrumbs = useMemo(
    () => [
      { label: 'إدارة الإعلانات', to: '/promotions' },
      { label: isEdit ? promotion?.title || 'تعديل إعلان' : 'إضافة إعلان' },
    ],
    [isEdit, promotion?.title],
  );

  useSetPageBreadcrumbs(pageBreadcrumbs);

  const loadMeta = useCallback(async () => {
    setMetaLoading(true);
    try {
      const [categoryData, providerData] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminProviders(),
      ]);
      setCategories(categoryData);
      setProviders(providerData);
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const handleSubmit = async (payload: PromotionFormPayload) => {
    setBusy(true);
    try {
      if (isEdit && id) {
        await updatePromotion(id, payload);
        toast.success('تم تحديث الإعلان.');
      } else {
        await createPromotion(payload);
        toast.success('تم إنشاء الإعلان.');
      }
      navigate('/promotions');
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : 'تعذر حفظ الإعلان.');
      throw saveError;
    } finally {
      setBusy(false);
    }
  };

  if (metaLoading || promotionsLoading) {
    return <LoadingState skeleton label={isEdit ? 'جاري تحميل الإعلان...' : 'جاري تحضير النموذج...'} />;
  }

  if (isEdit && !promotion) {
    return (
      <div className="mgmt-page">
        <ManagementPageHeader title="الإعلان غير موجود" subtitle="تعذر العثور على هذا الإعلان." />
        <Button onClick={() => navigate('/promotions')}>العودة للقائمة</Button>
      </div>
    );
  }

  return (
    <div className="mgmt-page promotions-form-page">
      <ManagementPageHeader
        title={isEdit ? 'تعديل إعلان' : 'إضافة إعلان'}
        subtitle="املأ التفاصيل وشاهد المعاينة على اليسار قبل الحفظ."
        actions={
          <Button variant="ghost" onClick={() => navigate('/promotions')}>
            العودة للقائمة
          </Button>
        }
      />

      <PromotionForm
        key={promotion?.id ?? 'new'}
        editing={promotion}
        categories={categories}
        providers={providers}
        busy={busy}
        onCancel={() => navigate('/promotions')}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
