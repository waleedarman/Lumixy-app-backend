import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageTransition } from '../components/ui/PageTransition';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { IconBell, IconChevron, IconLogout, IconMenu, NavIcon } from '../components/icons/AdminIcons';
import { AppLogo } from '../components/ui/AppLogo';
import { NAV_ITEMS, getPageBreadcrumbs } from '../constants/navigation';
import { PageBreadcrumbProvider, usePageBreadcrumbItems } from '../navigation/PageBreadcrumbContext';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useNotificationBadge } from '../hooks/useNotificationBadge';
import { useAdminScrollBehavior } from '../hooks/useAdminScrollBehavior';

const SIDEBAR_KEY = 'lumixy_admin_sidebar_collapsed';

function AdminLayoutShell() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = useNotificationBadge(admin?.id);
  const customBreadcrumbs = usePageBreadcrumbItems();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === '1');
  const { navRef, contentRef, handleNavScroll } = useAdminScrollBehavior(location.pathname);

  const breadcrumbItems = useMemo(() => {
    if (customBreadcrumbs?.length) {
      return customBreadcrumbs;
    }

    const breadcrumbs = getPageBreadcrumbs(location.pathname);
    const items = breadcrumbs.map((label, index) => {
      if (index === 0 && breadcrumbs.length > 1) {
        const root = location.pathname.split('/').filter(Boolean)[0];
        return { label, to: root ? `/${root}` : '/dashboard' };
      }
      return { label };
    });

    if (items.length === 0) {
      return [{ label: 'Lumixy Admin' }];
    }

    return items;
  }, [customBreadcrumbs, location.pathname]);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
      <div
        className="admin-overlay"
        role="presentation"
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside className="admin-sidebar" aria-hidden={false}>
        <div className="admin-brand">
          <AppLogo size="sm" className="admin-brand__mark" />
          <div className="admin-brand__text">
            <strong>Lumixy</strong>
            <span>لوحة الإدارة</span>
          </div>
        </div>

        <nav
          id="admin-sidebar-nav"
          ref={navRef}
          className="admin-nav"
          aria-label="التنقل الرئيسي"
          onScroll={handleNavScroll}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed && !mobileOpen ? item.label : undefined}
              className={({ isActive }) => `admin-nav__link ${isActive ? 'is-active' : ''}`}
            >
              <span className="admin-nav__icon">
                <NavIcon to={item.to} size={20} />
              </span>
              <span className="admin-nav__text">{item.label}</span>
              {item.badge && unreadCount > 0 ? (
                <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          {admin ? (
            <div className="admin-profile">
              <div className="admin-profile__avatar">{admin.full_name.slice(0, 1)}</div>
              <div className="admin-profile__meta">
                <strong>{admin.full_name}</strong>
                <span>{admin.email}</span>
              </div>
            </div>
          ) : null}

          <button type="button" className="btn btn-ghost admin-logout" onClick={() => setLogoutOpen(true)}>
            <IconLogout size={18} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <div className="admin-topbar__controls">
              <button
                type="button"
                className="ui-icon-btn admin-topbar__menu"
                aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={mobileOpen}
                aria-controls="admin-sidebar-nav"
                onClick={() => setMobileOpen((open) => !open)}
              >
                <IconMenu size={20} />
              </button>
              <button
                type="button"
                className="ui-icon-btn admin-topbar__collapse"
                aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
                onClick={() => setCollapsed((value) => !value)}
              >
                <span className={`admin-topbar__chevron ${collapsed ? 'is-flipped' : ''}`}>
                  <IconChevron size={18} />
                </span>
              </button>
            </div>
            <Breadcrumbs items={breadcrumbItems} compact />
          </div>

          <div className="admin-topbar__end">
            <ThemeToggle />
            <NavLink
              to="/notifications"
              className="ui-icon-btn"
              aria-label="الإشعارات"
              title="الإشعارات"
            >
              <IconBell size={20} />
              {unreadCount > 0 ? <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
            </NavLink>
            <div className="admin-topbar__account">
              <div className="admin-topbar__meta">
                <span className="admin-topbar__email">{admin?.email}</span>
                {admin?.is_super_admin ? <span className="badge badge-warning">مشرف عام</span> : null}
              </div>
            </div>
          </div>
        </header>

        <main ref={contentRef} className="admin-content">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="تسجيل الخروج"
        message="هل أنت متأكد أنك تريد تسجيل الخروج؟"
        confirmLabel="خروج"
        loading={loggingOut}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => void handleLogout()}
      />
    </div>
  );
}

export function AdminLayout() {
  return (
    <PageBreadcrumbProvider>
      <AdminLayoutShell />
    </PageBreadcrumbProvider>
  );
}
