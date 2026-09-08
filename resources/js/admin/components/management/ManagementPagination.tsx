type ManagementPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

function getVisiblePages(page: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

export function ManagementPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: ManagementPaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <nav className="mgmt-pagination" aria-label="ترقيم الصفحات">
      <div className="mgmt-pagination__bar">
        <button
          type="button"
          className="mgmt-pagination__edge"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          السابق
        </button>

        <div className="mgmt-pagination__pages" role="group" aria-label="اختيار الصفحة">
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`mgmt-pagination__page${pageNumber === page ? ' is-active' : ''}`}
              aria-label={`الصفحة ${pageNumber}`}
              aria-current={pageNumber === page ? 'page' : undefined}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber.toLocaleString('ar')}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="mgmt-pagination__edge"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          التالي
        </button>
      </div>

      <p className="mgmt-pagination__meta">
        {from.toLocaleString('ar')}–{to.toLocaleString('ar')} من {totalItems.toLocaleString('ar')}
      </p>
    </nav>
  );
}
