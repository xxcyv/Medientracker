import type { Category, DailyEntry, Medium, MediumStats } from '../sheets/types';

// All supported categories, in the fixed order used for tabs, filters and legends throughout the UI.
export const ALL_CATEGORIES: Category[] = ['game', 'series', 'book', 'movie'];

// Human-readable German labels for each category, used throughout the UI.
export const CATEGORY_LABELS: Record<Category, string> = {
  game: 'Videospiele',
  series: 'Serien',
  book: 'Bücher',
  movie: 'Filme',
};

/** Formats a minute count as "<h>:<mm>", matching the spreadsheet's own time notation. */
function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
}

/** Formats a minute count as "<h>:<mm>h", matching the spreadsheet's own time notation. */
export function formatMinutes(totalMinutes: number): string {
  return `${formatHoursMinutes(totalMinutes)}h`;
}

/** Returns the singular form for a count of exactly 1, otherwise the plural form. */
function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/** Renders the headline statistic for a medium, using the unit that matches its category. */
export function formatMainStat(medium: Medium, stats: MediumStats): string {
  switch (medium.category) {
    case 'game':
      return formatMinutes(stats.mainValue);
    case 'series':
      return `${stats.mainValue} ${pluralize(stats.mainValue, 'Folge', 'Folgen')}`;
    case 'book':
      return `${stats.mainValue} ${medium.bookUnit === 'pages' ? pluralize(stats.mainValue, 'Seite', 'Seiten') : 'Kapitel'}`;
    case 'movie':
      return `${stats.mainValue}× gesehen`;
  }
}

/** Renders one medium's total statistic for the export file, per the category-specific wording. */
export function formatExportStat(medium: Medium, stats: MediumStats): string {
  switch (medium.category) {
    case 'game':
      return formatMinutes(stats.mainValue);
    case 'series':
      return `${stats.mainValue} ${pluralize(stats.mainValue, 'Folge', 'Folgen')} geschaut`;
    case 'book':
      return `${stats.mainValue} ${medium.bookUnit === 'pages' ? pluralize(stats.mainValue, 'Seite', 'Seiten') : 'Kapitel'} gelesen`;
    case 'movie':
      return `${stats.mainValue} Mal geschaut`;
  }
}

/** Renders the amount consumed of one medium on a single day, for the calendar view. */
export function formatDailyAmount(mediumName: string, category: Category, entry: DailyEntry): string {
  switch (category) {
    case 'game':
      return formatMinutes(entry.amount);
    case 'series':
      // Critical Role episodes span multiple days, so the amount itself carries no useful count.
      if (mediumName === 'Critical Role') {
        return entry.episodeNumber !== undefined ? `Episode ${entry.episodeNumber}` : 'Episode unbekannt';
      }
      return `${entry.amount} ${pluralize(entry.amount, 'Folge', 'Folgen')}`;
    case 'book':
      return `${entry.amount} ${entry.unit === 'pages' ? pluralize(entry.amount, 'Seite', 'Seiten') : 'Kapitel'}`;
    case 'movie':
      return 'Gesehen';
  }
}

/** Returns the distinct years (ascending) in which a medium was consumed, based on its dated entries. */
export function getConsumedYears(medium: Medium): number[] {
  const years = new Set<number>();
  for (const entry of medium.entries) {
    if (entry.date !== null) years.add(Number(entry.date.slice(0, 4)));
    if (entry.legacy) for (const year of entry.legacy.years) years.add(year);
  }
  return [...years].sort((a, b) => a - b);
}

/** Renders the average-per-consumed-day secondary statistic, using the same unit as the main stat. */
export function formatAverage(medium: Medium, average: number): string {
  switch (medium.category) {
    case 'game':
      return formatMinutes(average);
    case 'series':
      return `${average.toFixed(2)} ${pluralize(Number(average.toFixed(2)), 'Folge', 'Folgen')}/Tag`;
    case 'book':
      return `${average.toFixed(2)} ${medium.bookUnit === 'pages' ? pluralize(Number(average.toFixed(2)), 'Seite', 'Seiten') : 'Kapitel'}/Tag`;
    case 'movie':
      return '';
  }
}
