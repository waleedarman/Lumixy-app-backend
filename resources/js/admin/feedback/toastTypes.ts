export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
  exiting?: boolean;
};

export const TOAST_VISIBLE_MS = 4200;
export const TOAST_EXIT_MS = 360;
export const LIST_EXIT_MS = 380;
