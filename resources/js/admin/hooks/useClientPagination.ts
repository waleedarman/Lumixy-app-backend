import { useEffect, useMemo, useState } from 'react';
import { LIST_PAGE_SIZE } from '../constants/pagination';

type UseClientPaginationOptions = {
  pageSize?: number;
  resetKey?: string | number;
};

export function useClientPagination<T>(
  items: T[],
  options: UseClientPaginationOptions = {},
) {
  const pageSize = options.pageSize ?? LIST_PAGE_SIZE;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [options.resetKey, items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    page: currentPage,
    setPage,
    totalPages,
    paginatedItems,
    totalItems: items.length,
    pageSize,
  };
}
