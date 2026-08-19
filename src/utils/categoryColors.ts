import type { Category } from '../sheets/types';

/** Muted, eye-friendly category colors used for the list and calendar views (list item borders, category badges, calendar dots). */
export const CATEGORY_COLORS: Record<Category, { base: string; text: string }> = {
  game: { base: '#5b7ff1', text: '#ffffff' },
  series: { base: '#c96e97', text: '#ffffff' },
  book: { base: '#c99a3e', text: '#1b1b1f' },
  movie: { base: '#3f8f5f', text: '#ffffff' },
};

/** Bolder, more saturated category colors used for chart bars in the filters view, distinct from the muted list/calendar palette. */
export const CATEGORY_CHART_COLORS: Record<Category, string> = {
  game: '#2f6fed',
  series: '#e63f8c',
  book: '#f2a71b',
  movie: '#1c9a55',
};
