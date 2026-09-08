import type { ReactNode } from 'react';
import { ManagementPagination } from './ManagementPagination';

export type TablePaginationConfig = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

type ManagementTableShellProps = {
  children: ReactNode;
  className?: string;
  pagination?: TablePaginationConfig;
};

export function ManagementTableShell({
  children,
  className = '',
  pagination,
}: ManagementTableShellProps) {
  return (
    <section className={`mgmt-table-shell ${className}`.trim()}>
      <div className="mgmt-table-wrap">{children}</div>
      {pagination ? <ManagementPagination {...pagination} /> : null}
    </section>
  );
}
