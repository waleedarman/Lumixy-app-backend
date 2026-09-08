import { Link } from 'react-router-dom';

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  compact?: boolean;
};

export function Breadcrumbs({ items, compact = false }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={`ui-breadcrumbs ${compact ? 'ui-breadcrumbs--compact' : ''}`.trim()}
      aria-label="مسار الصفحة"
    >
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="ui-breadcrumbs__item">
          {index > 0 ? <span className="ui-breadcrumbs__sep" aria-hidden>/</span> : null}
          {item.to ? (
            <Link to={item.to} className="ui-breadcrumbs__link">
              {item.label}
            </Link>
          ) : (
            <span className="ui-breadcrumbs__current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
