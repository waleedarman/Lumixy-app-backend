import { FormEvent, useCallback, useMemo, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  fetchAdminCategories,
} from '../api/adminService';
import { useToast } from '../feedback/ToastProvider';
import { animateListRemoval } from '../utils/animatedRemoval';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { ManagementToolbar } from '../components/management/ManagementToolbar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { FormField } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import { useClientPagination } from '../hooks/useClientPagination';
import { CategoriesTable } from '../components/categories/CategoriesTable';
import type { AppCategory } from '../types';

export function CategoriesPage() {
  const {
    data: categories,
    setData: setCategories,
    loading,
    refresh,
  } = useStaleResource('admin:categories', fetchAdminCategories, {
    snapshotKey: 'categories',
    initialData: [] as AppCategory[],
    syncTopics: 'categories',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const loadCategories = useCallback(
    async (silent = false) => {
      await refresh({ silent, force: false });
    },
    [refresh],
  );

  useRefreshOnFocus(() => void loadCategories(true));

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();
    if (!query) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(query));
  }, [categories, categorySearch]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems: paginatedCategories,
    totalItems,
    pageSize,
  } = useClientPagination(filteredCategories, { resetKey: categorySearch });

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('اكتب اسم التصنيف أولاً.');
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const created = await createCategory(trimmed, icon.trim() || undefined);
      setCategories((current) => [...current, created]);
      setName('');
      setIcon('');
      setCreateOpen(false);
      toast.success('تم إنشاء التصنيف.');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'تعذر إنشاء الفئة.');
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
        () => deleteCategory(targetId),
        () => setCategories((current) => current.filter((item) => item.id !== targetId)),
      );
      toast.success('تم حذف التصنيف.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'تعذر حذف الفئة.');
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  if (loading) return <LoadingState skeleton label="جاري تحميل الفئات..." />;

  return (
    <div className="mgmt-page">
      <ManagementPageHeader
        title="الفئات والخدمات"
        subtitle="تصفح الفئات وإدارة الخدمات الفرعية لكل فئة."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            إضافة فئة
          </Button>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <ManagementToolbar
        search={categorySearch}
        onSearchChange={setCategorySearch}
        searchPlaceholder="ابحث باسم الفئة"
        resultCount={filteredCategories.length}
        resultLabel="فئة"
      />

      {filteredCategories.length === 0 ? (
        <EmptyState title="لا توجد فئات مطابقة." />
      ) : (
        <CategoriesTable
          categories={paginatedCategories}
          exitingIds={exitingIds}
          pagination={{
            page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange: setPage,
          }}
          onDelete={setDeleteId}
        />
      )}

      <Modal
        open={createOpen}
        title="إضافة فئة جديدة"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              إلغاء
            </button>
            <button type="submit" form="create-category-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </>
        }
      >
        <form id="create-category-form" className="form-grid" onSubmit={(event) => void handleCreate(event)}>
          <FormField label="اسم الفئة" value={name} onChange={(event) => setName(event.target.value)} required />
          <FormField
            label="رابط الأيقونة (HTTPS اختياري)"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            hint="اتركه فارغاً إذا لم تكن هناك أيقونة."
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="حذف الفئة"
        message="هل أنت متأكد أنك تريد حذف هذه الفئة؟"
        confirmLabel="حذف"
        danger
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
