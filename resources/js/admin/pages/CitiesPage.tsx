import { FormEvent, useCallback, useMemo, useState } from 'react';
import { createCity, deleteCity, fetchAdminCities, syncAdminCitiesFromPcbs } from '../api/adminService';
import { flattenCities } from '../api/mappers';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../feedback/ToastProvider';
import { animateListRemoval, isExiting } from '../utils/animatedRemoval';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { ManagementTableShell } from '../components/management/ManagementTableShell';
import { ManagementToolbar } from '../components/management/ManagementToolbar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { IconMapPin } from '../components/icons/AdminIcons';
import { ActionsMenu } from '../components/ui/ActionsMenu';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import { useClientPagination } from '../hooks/useClientPagination';
import type { AppCityOption } from '../types';

export function CitiesPage() {
  const { isSuperAdmin } = useAuth();
  const {
    data: cities,
    setData: setCities,
    loading,
    refresh,
  } = useStaleResource('admin:cities', fetchAdminCities, {
    snapshotKey: 'cities',
    initialData: [] as AppCityOption[],
    syncTopics: 'cities',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmSync, setConfirmSync] = useState(false);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadCities = useCallback(
    async (silent = false) => {
      await refresh({ silent, force: false });
    },
    [refresh],
  );

  useRefreshOnFocus(() => void loadCities(true));

  const flatCities = useMemo(() => flattenCities(cities), [cities]);
  const governorates = useMemo(
    () => flatCities.filter((city) => !city.parentId),
    [flatCities],
  );

  const filteredCities = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return flatCities;
    return flatCities.filter(
      (city) =>
        city.name.toLowerCase().includes(query) ||
        (city.parentName || '').toLowerCase().includes(query),
    );
  }, [flatCities, search]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems: paginatedCities,
    totalItems,
    pageSize,
  } = useClientPagination(filteredCities, { resetKey: search });

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);

    try {
      await createCity(trimmed, parentId || undefined);
      await loadCities(true);
      setName('');
      setParentId('');
      setCreateOpen(false);
      toast.success('تمت إضافة المدينة.');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'تعذر إضافة المدينة.');
    } finally {
      setBusy(false);
    }
  };

  const handleSyncPcbs = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await syncAdminCitiesFromPcbs();
      await loadCities(true);
      setConfirmSync(false);
      toast.success(
        `${response.message} (${response.result.localities_created} جديد، ${response.result.localities_updated} محدّث)`,
      );
    } catch (syncError) {
      toast.error(syncError instanceof Error ? syncError.message : 'تعذر استيراد المدن من PCBS.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const targetId = deleteId;
    setBusy(true);
    setError(null);
    try {
      await animateListRemoval(
        targetId,
        setExitingIds,
        () => deleteCity(targetId),
        () => void loadCities(true),
      );
      setDeleteId(null);
      toast.success('تم حذف المدينة.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المدينة.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState skeleton label="جاري تحميل المواقع..." />;

  return (
    <div className="mgmt-page">
      <ManagementPageHeader
        title="المدن والمناطق"
        subtitle="استيراد المحافظات والمدن والقرى من مصدر PCBS الرسمي (ArcGIS)، أو إضافة مواقع يدوياً."
        actions={
          <div className="mgmt-page__actions">
            {isSuperAdmin ? (
              <Button
                variant="secondary"
                size="sm"
                loading={busy && confirmSync}
                onClick={() => setConfirmSync(true)}
              >
                استيراد من PCBS
              </Button>
            ) : null}
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              إضافة موقع
            </Button>
          </div>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <ManagementToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث باسم المحافظة أو المنطقة"
        resultCount={filteredCities.length}
        resultLabel="موقع"
      />

      {filteredCities.length === 0 ? (
        <EmptyState title="لا توجد مواقع مطابقة." />
      ) : (
        <>
        <ManagementTableShell
          pagination={{
            page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange: setPage,
          }}
        >
          <table className="mgmt-table">
            <thead>
              <tr>
                <th>الموقع</th>
                <th>المستوى</th>
                <th>المحافظة / الأب</th>
                {isSuperAdmin ? <th aria-label="إجراءات" /> : null}
              </tr>
            </thead>
            <tbody>
              {paginatedCities.map((city) => (
                <tr
                  key={city.id}
                  className={`mgmt-table__row${isExiting(exitingIds, city.id) ? ' is-exiting' : ''}`}
                >
                  <td data-label="الموقع">
                    <div className="mgmt-table__identity">
                      <div className="mgmt-table__avatar mgmt-table__avatar--placeholder">
                        <IconMapPin size={18} aria-hidden />
                      </div>
                      <strong className="mgmt-table__name">{city.name}</strong>
                    </div>
                  </td>
                  <td data-label="المستوى">
                    {city.parentId ? 'منطقة فرعية' : 'محافظة / رئيسي'}
                  </td>
                  <td data-label="المحافظة / الأب">{city.parentName || '—'}</td>
                  {isSuperAdmin ? (
                    <td className="mgmt-table__actions" data-label="إجراءات">
                      <ActionsMenu
                        items={[
                          {
                            key: 'delete',
                            label: 'حذف',
                            danger: true,
                            onClick: () => setDeleteId(city.id),
                          },
                        ]}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </ManagementTableShell>
        </>
      )}

      <Modal
        open={createOpen}
        title="إضافة موقع"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              إلغاء
            </button>
            <button type="submit" form="create-city-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </>
        }
      >
        <form id="create-city-form" className="form-grid" onSubmit={(event) => void handleCreate(event)}>
          <FormField label="الاسم" value={name} onChange={(event) => setName(event.target.value)} required />
          <FormField
            as="select"
            label="المحافظة الأب (اختياري)"
            value={parentId}
            onChange={(event) => setParentId(event.target.value)}
          >
            <option value="">محافظة / مدينة رئيسية</option>
            {governorates.map((city) => (
              <option key={city.id} value={city.id}>{city.name}</option>
            ))}
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmSync}
        title="استيراد المدن الفلسطينية"
        message="سيتم جلب جميع المحافظات والمدن والقرى من مصدر PCBS الرسمي (ArcGIS) وتحديث قاعدة البيانات. قد يستغرق ذلك دقيقة."
        confirmLabel="بدء الاستيراد"
        loading={busy}
        onCancel={() => setConfirmSync(false)}
        onConfirm={() => void handleSyncPcbs()}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="حذف الموقع"
        message="هل أنت متأكد أنك تريد حذف هذا الموقع؟"
        confirmLabel="حذف"
        danger
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
