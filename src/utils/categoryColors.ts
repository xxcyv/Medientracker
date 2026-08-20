import type { Category } from '../sheets/types';

/**
 * Muted, eye-friendly category colors used for the list and calendar views (list item borders, category badges,
 * calendar dots). Hues are chosen from the Okabe-Ito colorblind-safe palette (blue / reddish purple / orange /
 * bluish green) so that series and movie in particular stay distinguishable under red-green color vision
 * deficiencies (e.g. deuteranomaly), rather than relying on hues along the confusable red-green axis.
 */
export const CATEGORY_COLORS: Record<Category, { base: string; text: string }> = {
  game: { base: '#0072b2', text: '#ffffff' },
  series: { base: '#cc79a7', text: '#ffffff' },
  book: { base: '#e69f00', text: '#1b1b1f' },
  movie: { base: '#009e73', text: '#ffffff' },
};

/** Bolder, more saturated category colors used for chart bars in the filters view, same colorblind-safe hues as CATEGORY_COLORS. */
export const CATEGORY_CHART_COLORS: Record<Category, string> = {
  game: '#008fd5',
  series: '#c94f92',
  book: '#f2a900',
  movie: '#00b386',
};
