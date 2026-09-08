import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconMore } from '../icons/AdminIcons';

export type ActionMenuItem = {
  key: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

type ActionsMenuProps = {
  items: ActionMenuItem[];
  busy?: boolean;
};

type PanelPosition = {
  top: number;
  left: number;
  minWidth: number;
};

const PANEL_MIN_WIDTH = 200;
const VIEWPORT_PADDING = 8;

function computePanelPosition(trigger: HTMLElement, panelHeight: number): PanelPosition {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const minWidth = Math.max(PANEL_MIN_WIDTH, rect.width);

  let left = rect.right - minWidth;
  left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - minWidth - VIEWPORT_PADDING));

  let top = rect.bottom + 6;
  if (top + panelHeight > viewportHeight - VIEWPORT_PADDING) {
    top = rect.top - panelHeight - 6;
  }
  top = Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - panelHeight - VIEWPORT_PADDING));

  return { top, left, minWidth };
}

export function ActionsMenu({ items, busy = false }: ActionsMenuProps) {
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !panelRef.current) return;
    setPosition(
      computePanelPosition(triggerRef.current, panelRef.current.offsetHeight || items.length * 44 + 8),
    );
  };

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const frame = window.requestAnimationFrame(() => updatePosition());

    const handleReposition = () => updatePosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const panel =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            id={menuId}
            className="actions-menu__panel actions-menu__panel--floating"
            role="menu"
            style={
              position
                ? {
                    top: `${position.top}px`,
                    left: `${position.left}px`,
                    minWidth: `${position.minWidth}px`,
                  }
                : { visibility: 'hidden' }
            }
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                className={`actions-menu__item ${item.danger ? 'is-danger' : ''}`}
                disabled={item.disabled || busy}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="actions-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="ui-icon-btn actions-menu__trigger"
        aria-label="إجراءات"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
      >
        <IconMore size={16} />
      </button>
      {panel}
    </div>
  );
}
