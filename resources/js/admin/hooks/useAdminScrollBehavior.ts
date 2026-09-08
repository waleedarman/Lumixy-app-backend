import { useCallback, useEffect, useRef } from 'react';

const SIDEBAR_SCROLL_KEY = 'lumixy_admin_sidebar_scroll';

function isCompletelyOutside(container: HTMLElement, item: HTMLElement): 'above' | 'below' | null {
  const containerRect = container.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();

  if (itemRect.bottom <= containerRect.top) return 'above';
  if (itemRect.top >= containerRect.bottom) return 'below';
  return null;
}

function revealActiveNavItem(nav: HTMLElement) {
  const active = nav.querySelector<HTMLElement>('.admin-nav__link.is-active');
  if (!active) return;

  const placement = isCompletelyOutside(nav, active);
  if (!placement) return;

  const containerRect = nav.getBoundingClientRect();
  const itemRect = active.getBoundingClientRect();

  if (placement === 'above') {
    nav.scrollTop -= containerRect.top - itemRect.top;
  } else {
    nav.scrollTop += itemRect.bottom - containerRect.bottom;
  }
}

export function useAdminScrollBehavior(pathname: string) {
  const navRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const sidebarScrollRef = useRef(0);

  useEffect(() => {
    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (!saved) return;

    const scrollTop = Number(saved);
    if (Number.isNaN(scrollTop)) return;

    sidebarScrollRef.current = scrollTop;

    const nav = navRef.current;
    if (nav) {
      nav.scrollTop = scrollTop;
    }
  }, []);

  const handleNavScroll = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    sidebarScrollRef.current = nav.scrollTop;
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (content) {
      content.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }

    const nav = navRef.current;
    if (!nav) return;

    nav.scrollTop = sidebarScrollRef.current;

    const frame = window.requestAnimationFrame(() => {
      revealActiveNavItem(nav);
      sidebarScrollRef.current = nav.scrollTop;
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(nav.scrollTop));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return {
    navRef,
    contentRef,
    handleNavScroll,
  };
}
