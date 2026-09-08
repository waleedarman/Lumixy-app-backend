import type { AppCityOption } from '../types';

export function findCityOptionById(options: AppCityOption[], id?: string | null): AppCityOption | null {
  if (!id) return null;

  for (const option of options) {
    if (option.id === id) return option;
    const childMatch = findCityOptionById(option.children || [], id);
    if (childMatch) return childMatch;
  }

  return null;
}

export function getCityDescendantIds(options: AppCityOption[], id?: string | null): string[] {
  const target = findCityOptionById(options, id);
  if (!target) return [];

  return [
    target.id,
    ...target.children.flatMap((child) => getCityDescendantIds([child], child.id)),
  ];
}
