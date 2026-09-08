import { FormEvent, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createSubcategory,
  deleteSubcategory,
  fetchAdminCategories,
} from '../api/adminService';
import { useToast } from '../feedback/ToastProvider';
import { animateListRemoval, isExiting } from '../utils/animatedRemoval';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { ManagementTableShell } from '../components/management/ManagementTableShell';
import { ManagementToolbar } from '../components/management/ManagementToolbar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ActionsMenu } from '../components/ui/ActionsMenu';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useClientPagination } from '../hooks/useClientPagination';
import { useStaleResource } from '../hooks/useStaleResource';
import { useSetPageBreadcrumbs } from '../navigation/PageBreadcrumbContext';
import type { AppCategory } from '../types';

export function CategoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: categories,
    setData: setCategories,
    loading,
  } = useStaleResource('admin:categories', fetchAdminCategories, {
    snapshotKey: 'categories',
    initialData: [] as AppCategory[],
    syncTopics: 'categories',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const category = useMemo(
    () => categories.find((item) => item.id === id) || null,
    [categories, id],
  );

  const pageBreadcrumbs = useMemo(
    () =>
      category
        ? [
            { label: 'الفئات والخدمات', to: '/categories' },
            { label: category.name },
          ]
        : [{ label: 'الفئات والخدمات', to: '/categories' }, { label: '...' }],
    [category],
  );

  useSetPageBreadcrumbs(pageBreadcrumbs);

  const filteredServices = useMemo(() => {
    if (!category) return [];
    const query = search.trim().toLowerCase();
    if (!query) return category.subServiceOptions;
    return category.subServiceOptions.filter((service) =>
      service.name.toLowerCase().includes(query),
    );
  }, [category, search]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems: paginatedServices,
    totalItems,
    pageSize,
  } = useClientPagination(filteredServices, { resetKey: search });

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!category) return;

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('اكتب اسم الخدمة أولاً.');
      return;
    }

    if (category.subServiceOptions.some((item) => item.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('هذه الخدمة موجودة بالفعل.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await createSubcategory(category.id, trimmed);
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id
            ? {
                ...item,
                subServices: [...item.subServices, created.name],
                subServiceOptions: [...item.subServiceOptions, created],
              }
            : item,
        ),
      );
      setName('');
      setCreateOpen(false);
      toast.success('تمت إضافة الخدمة.');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'تعذر إضافة الخدمة.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !category) return;

    const targetId = deleteId;
    setBusy(true);
    setError(null);

    try {
      await animateListRemoval(
        targetId,
        setExitingIds,
        () => deleteSubcategory(targetId),
        () =>
          setCategories((current) =>
            current.map((item) =>
              item.id === category.id
                ? {
                    ...item,
                    subServices: item.subServices.filter(
                      (service) =>
                        !item.subServiceOptions.some(
                          (option) => option.id === targetId && option.name === service,
                        ),
                    ),
                    subServiceOptions: item.subServiceOptions.filter((option) => option.id !== targetId),
                  }
                : item,
            ),
          ),
      );
      toast.success('تم حذف الخدمة.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الخدمة.');
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  if (loading) return <LoadingState skeleton label="جاري تحميل الفئة..." />;
  if (!category) return <EmptyState title="الفئة غير موجودة." />;

  return (
    <div className="mgmt-page">
      <ManagementPageHeader
        title={category.name}
        subtitle="إدارة الخدمات الفرعية المرتبطة بهذه الفئة."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            إضافة خدمة
          </Button>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <div className="mgmt-detail-strip">
        <div className="mgmt-detail-strip__copy">
          <h3>{category.name}</h3>
          <p>{category.subServiceOptions.length.toLocaleString('ar')} خدمة فرعية</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => navigate(`/providers?categoryId=${category.id}`)}
        >
          عرض المزودين
        </button>
      </div>

      <ManagementToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث باسم الخدمة"
        resultCount={filteredServices.length}
        resultLabel="خدمة"
      />

      {filteredServices.length === 0 ? (
        <EmptyState title="لا توجد خدمات فرعية بعد." />
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
                <th>الخدمة</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {paginatedServices.map((service) => (
                <tr key={service.id} className={`mgmt-table__row${isExiting(exitingIds, service.id) ? ' is-exiting' : ''}`}>
                  <td data-label="الخدمة">
                    <strong className="mgmt-table__name">{service.name}</strong>
                  </td>
                  <td className="mgmt-table__actions" data-label="إجراءات">
                    <ActionsMenu
                      items={[
                        {
                          key: 'providers',
                          label: 'عرض المزودين',
                          onClick: () =>
                            navigate(
                              `/providers?categoryId=${category.id}&subService=${encodeURIComponent(service.name)}`,
                            ),
                        },
                        {
                          key: 'delete',
                          label: 'حذف',
                          danger: true,
                          onClick: () => setDeleteId(service.id),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ManagementTableShell>
        </>
      )}

      <Modal
        open={createOpen}
        title="إضافة خدمة فرعية"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              إلغاء
            </button>
            <button type="submit" form="create-subservice-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </>
        }
      >
        <form id="create-subservice-form" className="form-grid" onSubmit={(event) => void handleCreate(event)}>
          <FormField label="اسم الخدمة" value={name} onChange={(event) => setName(event.target.value)} required />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="حذف الخدمة"
        message="هل أنت متأكد أنك تريد حذف هذه الخدمة؟"
        confirmLabel="حذف"
        danger
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
