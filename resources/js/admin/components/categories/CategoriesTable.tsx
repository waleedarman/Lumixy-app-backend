import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { isExiting } from '../../utils/animatedRemoval';
import type { AppCategory } from '../../types';
import { AdminImage } from '../ui/AdminImage';
import { ActionsMenu } from '../ui/ActionsMenu';
import { ManagementTableShell } from '../management/ManagementTableShell';
import type { TablePaginationConfig } from '../management/ManagementTableShell';

type CategoriesTableProps = {
  categories: AppCategory[];
  exitingIds?: Set<string>;
  pagination?: TablePaginationConfig;
  onDelete: (id: string) => void;
};

function getServicePreview(category: AppCategory): string {
  if (category.subServiceOptions.length === 0) return 'لا توجد خدمات فرعية بعد';
  const preview = category.subServiceOptions
    .slice(0, 2)
    .map((service) => service.name)
    .join(' · ');
  if (category.subServiceOptions.length > 2) {
    return `${preview} +${category.subServiceOptions.length - 2}`;
  }
  return preview;
}

function CategoryAvatar({ category }: { category: AppCategory }) {
  const hasImage = category.icon && /^https?:\/\//i.test(category.icon);

  if (hasImage) {
    return (
      <AdminImage
        src={category.icon}
        alt=""
        className="categories-table__avatar"
      />
    );
  }

  return (
    <div className="categories-table__avatar categories-table__avatar--placeholder">
      {category.icon?.trim() || category.name.slice(0, 1)}
    </div>
  );
}

export const CategoriesTable = memo(function CategoriesTable({
  categories,
  exitingIds,
  pagination,
  onDelete,
}: CategoriesTableProps) {
  const navigate = useNavigate();

  return (
    <ManagementTableShell pagination={pagination}>
      <table className="mgmt-table categories-table">
        <thead>
          <tr>
            <th>الفئة</th>
            <th>الخدمات الفرعية</th>
            <th aria-label="إجراءات" />
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => {
            const serviceCount = category.subServiceOptions.length;

            return (
              <tr
                key={category.id}
                className={`categories-table__row${exitingIds && isExiting(exitingIds, category.id) ? ' is-exiting' : ''}`}
                tabIndex={0}
                onClick={() => navigate(`/categories/${category.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/categories/${category.id}`);
                  }
                }}
              >
                <td data-label="الفئة">
                  <div className="categories-table__identity">
                    <CategoryAvatar category={category} />
                    <div>
                      <strong className="categories-table__name">{category.name}</strong>
                      <span className="categories-table__preview">{getServicePreview(category)}</span>
                    </div>
                  </div>
                </td>

                <td data-label="الخدمات الفرعية">
                  <span className="categories-table__count">
                    {serviceCount.toLocaleString('ar')}
                  </span>
                </td>

                <td
                  className="categories-table__actions"
                  data-label="إجراءات"
                  onClick={(event) => event.stopPropagation()}
                >
                  <ActionsMenu
                    items={[
                      {
                        key: 'manage',
                        label: 'إدارة الخدمات',
                        onClick: () => navigate(`/categories/${category.id}`),
                      },
                      {
                        key: 'delete',
                        label: 'حذف',
                        danger: true,
                        onClick: () => onDelete(category.id),
                      },
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
