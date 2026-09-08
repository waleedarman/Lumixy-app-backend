import { IconBell, IconImage } from './icons/AdminIcons';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: 'image' | 'bell' | 'default';
};

export function EmptyState({ title, description, icon = 'default' }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <div className="ui-empty__icon" aria-hidden>
        {icon === 'image' ? (
          <IconImage size={28} />
        ) : icon === 'bell' ? (
          <IconBell size={28} />
        ) : (
          <span className="ui-empty__dot" />
        )}
      </div>
      <h3 className="ui-empty__title">{title}</h3>
      {description ? <p className="ui-empty__desc">{description}</p> : null}
    </div>
  );
}
