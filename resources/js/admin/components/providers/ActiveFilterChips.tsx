import { FilterChips, type FilterChip } from '../management/FilterChips';

export type ActiveFilterChip = FilterChip;

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[];
};

export function ActiveFilterChips({ chips }: ActiveFilterChipsProps) {
  return <FilterChips chips={chips} />;
}
