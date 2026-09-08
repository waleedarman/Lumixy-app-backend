import { memo } from 'react';
import { isExiting } from '../../utils/animatedRemoval';
import {
  getPromotionStatusLabel,
  PROMOTION_ACTION_OPTIONS,
} from '../../api/promotionService';
import type { AppPromotion } from '../../types';
import { AdminImage } from '../ui/AdminImage';
import { ActionsMenu } from '../ui/ActionsMenu';
import { ManagementTableShell } from '../management/ManagementTableShell';

type PromotionsTableProps = {
  promotions: AppPromotion[];
  exitingIds?: Set<string>;
  busyId?: string | null;
  dragOverId?: string | null;
  draggingId?: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
  onPreview: (promotion: AppPromotion) => void;
  onEdit: (promotion: AppPromotion) => void;
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function actionLabel(actionType: AppPromotion['actionType']) {
  return PROMOTION_ACTION_OPTIONS.find((item) => item.value === actionType)?.label ?? actionType;
}

export const PromotionsTable = memo(function PromotionsTable({
  promotions,
  exitingIds,
  busyId,
  dragOverId,
  draggingId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onPreview,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
}: PromotionsTableProps) {
  return (
    <ManagementTableShell>
      <table className="mgmt-table promotions-table">
        <thead>
          <tr>
            <th aria-label="ترتيب" />
            <th>الإعلان</th>
            <th>الحالة</th>
            <th>البداية</th>
            <th>النهاية</th>
            <th>الترتيب</th>
            <th>النقرات</th>
            <th>الإجراء</th>
            <th aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody>
          {promotions.map((promotion) => {
            const status = getPromotionStatusLabel(promotion);
            const statusClass =
              status === 'فعال'
                ? 'badge-active'
                : status === 'مجدول'
                  ? 'badge-pending'
                  : status === 'منتهي'
                    ? 'badge-deactivated'
                    : 'badge-deactivated';

            return (
              <tr
                key={promotion.id}
                className={`promotions-table__row${exitingIds && isExiting(exitingIds, promotion.id) ? ' is-exiting' : ''}${dragOverId === promotion.id ? ' is-drag-over' : ''}`}
                draggable
                onDragStart={() => onDragStart(promotion.id)}
                onDragOver={(event) => {
                  event.preventDefault();
                  onDragOver(promotion.id);
                }}
                onDragEnd={onDragEnd}
              >
                <td>
                  <span
                    className={`promotions-table__drag${draggingId === promotion.id ? ' is-dragging' : ''}`}
                    aria-hidden
                  >
                    ⋮⋮
                  </span>
                </td>
                <td>
                  <div className="providers-table__identity">
                    <AdminImage
                      src={promotion.image}
                      alt={promotion.title || 'إعلان'}
                      className="promotions-table__thumb"
                    />
                    <div>
                      <strong>{promotion.title || 'إعلان بدون عنوان'}</strong>
                      <p className="mgmt-table__meta">{actionLabel(promotion.actionType)}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${statusClass}`}>{status}</span>
                </td>
                <td>{formatDate(promotion.startDate)}</td>
                <td>{formatDate(promotion.endDate)}</td>
                <td>{promotion.displayOrder}</td>
                <td>{promotion.clickCount}</td>
                <td>{promotion.isActive ? 'مفعّل' : 'معطّل'}</td>
                <td onClick={(event) => event.stopPropagation()}>
                  <ActionsMenu
                    busy={busyId === promotion.id}
                    items={[
                      { key: 'preview', label: 'معاينة', onClick: () => onPreview(promotion) },
                      { key: 'edit', label: 'تعديل', onClick: () => onEdit(promotion) },
                      {
                        key: 'toggle',
                        label: promotion.isActive ? 'تعطيل' : 'تفعيل',
                        onClick: () => onToggle(promotion.id),
                      },
                      { key: 'duplicate', label: 'نسخ', onClick: () => onDuplicate(promotion.id) },
                      { key: 'delete', label: 'حذف', onClick: () => onDelete(promotion.id), danger: true },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ManagementTableShell>
  );
});
