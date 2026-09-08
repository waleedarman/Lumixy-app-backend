import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { ToastItem, ToastTone } from './toastTypes';
import { TOAST_EXIT_MS, TOAST_VISIBLE_MS } from './toastTypes';

type ToastInput = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  push: (input: ToastInput) => string;
  success: (message: string) => string;
  error: (message: string) => string;
  info: (message: string) => string;
  warning: (message: string) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden className="ui-toast__icon">
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm3.78 6.03-4.2 4.35a.75.75 0 0 1-1.08.02l-2.1-2.1a.75.75 0 1 1 1.06-1.06l1.56 1.56 3.67-3.8a.75.75 0 1 1 1.09 1.03Z" />
      </svg>
    );
  }

  if (tone === 'error') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden className="ui-toast__icon">
        <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM9.25 6.5a.75.75 0 0 1 1.5 0v4.25a.75.75 0 0 1-1.5 0V6.5Zm.75 7.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
    );
  }

  if (tone === 'warning') {
    return (
      <svg viewBox="0 0 20 20" aria-hidden className="ui-toast__icon">
        <path d="M10 2.25 1.75 16.5h16.5L10 2.25Zm0 4.5a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V7.5A.75.75 0 0 1 10 6.75Zm0 8.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden className="ui-toast__icon">
      <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm.75 4.75a.75.75 0 0 0-1.5 0v4.5a.75.75 0 0 0 1.5 0v-4.5Zm-.75 8.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.map((item) => (item.id === id ? { ...item, exiting: true } : item)),
    );

    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, TOAST_EXIT_MS);
  }, []);

  const push = useCallback(
    ({ message, tone = 'info', durationMs = TOAST_VISIBLE_MS }: ToastInput) => {
      const id = createToastId();
      setToasts((current) => [...current, { id, tone, message }]);

      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (message) => push({ message, tone: 'success' }),
      error: (message) => push({ message, tone: 'error' }),
      info: (message) => push({ message, tone: 'info' }),
      warning: (message) => push({ message, tone: 'warning' }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined'
        ? createPortal(
            <div className="ui-toast-stack" aria-live="polite" aria-relevant="additions text">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`ui-toast ui-toast--${toast.tone}${toast.exiting ? ' is-exiting' : ' is-entering'}`}
                  role="status"
                >
                  <ToastIcon tone={toast.tone} />
                  <p className="ui-toast__message">{toast.message}</p>
                  <button
                    type="button"
                    className="ui-toast__close"
                    aria-label="إغلاق"
                    onClick={() => dismiss(toast.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider.');
  }
  return context;
}
