import { ManagementPagination } from '../management/ManagementPagination';

type ProvidersPaginationProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function ProvidersPagination(props: ProvidersPaginationProps) {
  return <ManagementPagination {...props} />;
}
