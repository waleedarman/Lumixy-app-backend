import { IconButton } from './IconButton';
import { IconRefresh } from '../icons/AdminIcons';

type RefreshButtonProps = {
  loading?: boolean;
  onClick: () => void;
};

export function RefreshButton({ loading = false, onClick }: RefreshButtonProps) {
  return (
    <IconButton
      label={loading ? 'جاري التحديث' : 'تحديث البيانات'}
      disabled={loading}
      onClick={onClick}
    >
      <span className={loading ? 'ui-spin' : ''}>
        <IconRefresh size={18} />
      </span>
    </IconButton>
  );
}
