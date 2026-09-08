import type { Dispatch, SetStateAction } from 'react';
import { LIST_EXIT_MS } from '../feedback/toastTypes';

export function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function animateListRemoval<T>(
  id: string,
  setExitingIds: Dispatch<SetStateAction<Set<string>>>,
  action: () => Promise<T>,
  removeFromList: () => void,
): Promise<T> {
  const result = await action();

  setExitingIds((current) => {
    const next = new Set(current);
    next.add(id);
    return next;
  });

  await wait(LIST_EXIT_MS);
  removeFromList();

  setExitingIds((current) => {
    const next = new Set(current);
    next.delete(id);
    return next;
  });

  return result;
}

export function isExiting(exitingIds: Set<string>, id: string) {
  return exitingIds.has(id);
}
