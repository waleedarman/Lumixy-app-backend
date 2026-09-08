import { useEffect, useState, type ReactNode } from 'react';

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
  className?: string;
};

const EXIT_MS = 240;

export function Modal({ open, title, onClose, children, footer, size = 'md', className = '' }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase('enter');
      return;
    }

    if (!mounted) return;

    setPhase('exit');
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  if (!mounted) return null;

  const overlayClass = phase === 'enter' ? 'is-entering' : 'is-exiting';
  const cardClass = phase === 'enter' ? 'is-entering' : 'is-exiting';

  return (
    <div className={`modal-overlay ${overlayClass}`} role="presentation" onClick={onClose}>
      <div
        className={`modal-card modal-card--${size} ${className} ${cardClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-card__header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-btn" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-card__body">{children}</div>
        {footer ? <div className="modal-card__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
