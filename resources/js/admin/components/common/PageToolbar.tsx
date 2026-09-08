import type { ReactNode } from 'react';

type PageToolbarProps = {
  description?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageToolbar({ description, breadcrumbs, actions, children }: PageToolbarProps) {
  return (
    <section className="page-toolbar">
      <div className="page-toolbar__main">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="breadcrumbs" aria-label="مسار الصفحة">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`}>
                {index > 0 ? <span className="breadcrumbs__sep">/</span> : null}
                <span>{crumb}</span>
              </span>
            ))}
          </nav>
        ) : null}
        {description ? <p className="page-toolbar__desc">{description}</p> : null}
      </div>
      {actions ? <div className="page-toolbar__actions">{actions}</div> : null}
      {children}
    </section>
  );
}
