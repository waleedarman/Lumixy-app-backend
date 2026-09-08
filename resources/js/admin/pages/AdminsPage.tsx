import { FormEvent, useCallback, useMemo, useState } from 'react';
import {
  createAdminAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  updateAdminAccountStatus,
} from '../api/adminService';
import { useToast } from '../feedback/ToastProvider';
import { animateListRemoval, isExiting } from '../utils/animatedRemoval';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ManagementPageHeader } from '../components/management/ManagementPageHeader';
import { ManagementTableShell } from '../components/management/ManagementTableShell';
import { ManagementToolbar } from '../components/management/ManagementToolbar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { ActionsMenu } from '../components/ui/ActionsMenu';
import { FormField } from '../components/ui/FormField';
import { LtrText } from '../components/ui/LtrText';
import { Modal } from '../components/ui/Modal';
import { PasswordField } from '../components/ui/PasswordField';
import { StatusBadge } from '../components/ui/StatusBadge';
import { useRefreshOnFocus } from '../hooks/useRefreshOnFocus';
import { useStaleResource } from '../hooks/useStaleResource';
import { useClientPagination } from '../hooks/useClientPagination';
import type { AdminAccount } from '../types';

export function AdminsPage() {
  const { admin } = useAuth();
  const {
    data: admins,
    setData: setAdmins,
    loading,
    refresh,
  } = useStaleResource('admin:admins', fetchAdminAccounts, {
    snapshotKey: 'admins',
    initialData: [] as AdminAccount[],
    syncTopics: 'admins',
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toggleTarget, setToggleTarget] = useState<AdminAccount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());
  const toast = useToast();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const loadAdmins = useCallback(
    async (silent = false) => {
      await refresh({ silent, force: false });
    },
    [refresh],
  );

  useRefreshOnFocus(() => void loadAdmins(true));

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return admins;
    return admins.filter(
      (item) =>
        item.full_name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query),
    );
  }, [admins, search]);

  const {
    page,
    setPage,
    totalPages,
    paginatedItems: paginatedAdmins,
    totalItems,
    pageSize,
  } = useClientPagination(filteredAdmins, { resetKey: search });

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      toast.error('تأكيد كلمة المرور غير متطابق.');
      return;
    }

    setBusy(true);
    try {
      const created = await createAdminAccount({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        password_confirmation: passwordConfirmation,
      });
      setAdmins((current) => [created, ...current]);
      setFullName('');
      setEmail('');
      setPassword('');
      setPasswordConfirmation('');
      setCreateOpen(false);
      toast.success('تم إنشاء حساب المشرف بنجاح.');
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : 'تعذر إنشاء المشرف.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleStatus = async (target: AdminAccount) => {
    if (target.id === admin?.id) {
      setError('لا يمكنك إزالة صلاحيات حسابك الحالي.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const nextStatus = target.status === 'active' ? 'inactive' : 'active';
      const updated = await updateAdminAccountStatus(target.id, nextStatus);
      setAdmins((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(nextStatus === 'active' ? 'تم تفعيل الحساب.' : 'تم تعطيل الحساب.');
    } catch (toggleError) {
      toast.error(toggleError instanceof Error ? toggleError.message : 'تعذر تحديث حالة المشرف.');
    } finally {
      setBusy(false);
      setToggleTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    if (deleteId === admin?.id) {
      toast.error('لا يمكنك حذف حسابك الإداري الحالي.');
      setDeleteId(null);
      return;
    }

    const targetId = deleteId;
    setBusy(true);
    setError(null);
    try {
      await animateListRemoval(
        targetId,
        setExitingIds,
        () => deleteAdminAccount(targetId),
        () => setAdmins((current) => current.filter((item) => item.id !== targetId)),
      );
      toast.success('تم حذف حساب المشرف.');
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'تعذر حذف المشرف.');
    } finally {
      setBusy(false);
      setDeleteId(null);
    }
  };

  if (loading) return <LoadingState skeleton label="جاري تحميل المشرفين..." />;

  return (
    <div className="mgmt-page">
      <ManagementPageHeader
        title="المشرفون"
        subtitle="عرض وإنشاء وإدارة حسابات المشرفين."
        actions={
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            إضافة مشرف
          </Button>
        }
      />

      {error ? <div className="alert alert-error">{error}</div> : null}

      <ManagementToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث بالاسم أو البريد الإلكتروني"
        resultCount={filteredAdmins.length}
        resultLabel="مشرف"
      />

      {filteredAdmins.length === 0 ? (
        <EmptyState title="لا يوجد مشرفون." />
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
                <th>الاسم</th>
                <th>البريد</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th aria-label="إجراءات" />
              </tr>
            </thead>
            <tbody>
              {paginatedAdmins.map((item) => {
                const isSelf = item.id === admin?.id;
                return (
                  <tr key={item.id} className={`mgmt-table__row${isExiting(exitingIds, item.id) ? ' is-exiting' : ''}`}>
                    <td data-label="الاسم">
                      <div className="mgmt-table__identity">
                        <div className="mgmt-table__avatar mgmt-table__avatar--placeholder">
                          {item.full_name.slice(0, 1)}
                        </div>
                        <div>
                          <strong className="mgmt-table__name">{item.full_name}</strong>
                          {item.is_super_admin ? (
                            <span className="mgmt-table__sub">مشرف عام</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td data-label="البريد">
                      <LtrText className="mgmt-table__sub">{item.email}</LtrText>
                    </td>
                    <td data-label="الحالة">
                      <StatusBadge status={item.status} />
                    </td>
                    <td data-label="التاريخ">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('ar-EG')
                        : '—'}
                    </td>
                    <td className="mgmt-table__actions" data-label="إجراءات">
                      {isSelf ? (
                        <span className="mgmt-table__sub">حسابك</span>
                      ) : (
                        <ActionsMenu
                          busy={busy}
                          items={[
                            {
                              key: 'toggle',
                              label: item.status === 'active' ? 'تعطيل' : 'تفعيل',
                              onClick: () => setToggleTarget(item),
                            },
                            {
                              key: 'delete',
                              label: 'حذف',
                              danger: true,
                              onClick: () => setDeleteId(item.id),
                            },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ManagementTableShell>
        </>
      )}

      <Modal
        open={createOpen}
        title="إضافة مشرف جديد"
        onClose={() => setCreateOpen(false)}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              إلغاء
            </button>
            <button type="submit" form="create-admin-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'جاري الإنشاء...' : 'إنشاء'}
            </button>
          </>
        }
      >
        <form id="create-admin-form" className="form-grid form-grid--2" onSubmit={(event) => void handleCreate(event)}>
          <FormField label="الاسم الكامل" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          <FormField
            label="البريد الإلكتروني"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <PasswordField label="كلمة المرور" value={password} onChange={setPassword} required />
          <PasswordField
            label="تأكيد كلمة المرور"
            value={passwordConfirmation}
            onChange={setPasswordConfirmation}
            required
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={toggleTarget?.status === 'active' ? 'تعطيل المشرف' : 'تفعيل المشرف'}
        message={
          toggleTarget?.status === 'active'
            ? `هل أنت متأكد من تعطيل "${toggleTarget.full_name}"؟`
            : `هل أنت متأكد من تفعيل "${toggleTarget?.full_name}"؟`
        }
        confirmLabel={toggleTarget?.status === 'active' ? 'تعطيل' : 'تفعيل'}
        danger={toggleTarget?.status === 'active'}
        loading={busy}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && void handleToggleStatus(toggleTarget)}
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="حذف المشرف"
        message="هل أنت متأكد أنك تريد حذف هذا الحساب؟"
        confirmLabel="حذف"
        danger
        loading={busy}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
