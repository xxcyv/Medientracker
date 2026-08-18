import type { Category, Medium, MediumStats } from '../sheets/types';

export const CATEGORY_LABELS: Record<Category, string> = {
  game: 'Videospiele',
  series: 'Serien',
  book: 'Bücher',
  movie: 'Filme',
};

/** Formats a minute count as "<h>:<mm>h", matching the spreadsheet's own time notation. */
export function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours}:${minutes.toString().padStart(2, '0')}h`;
}

/** Renders the headline statistic for a medium, using the unit that matches its category. */
export function formatMainStat(medium: Medium, stats: MediumStats): string {
  switch (medium.category) {
    case 'game':
      return formatMinutes(stats.mainValue);
    case 'series':
      return `${stats.mainValue} Folgen`;
    case 'book':
      return `${stats.mainValue} ${medium.bookUnit === 'pages' ? 'Seiten' : 'Kapitel'}`;
    case 'movie':
      return `${stats.mainValue}× gesehen`;
  }
}

/** Renders the average-per-consumed-day secondary statistic, using the same unit as the main stat. */
export function formatAverage(medium: Medium, average: number): string {
  switch (medium.category) {
    case 'game':
      return formatMinutes(average);
    case 'series':
      return `${average.toFixed(1)} Folgen/Tag`;
    case 'book':
      return `${average.toFixed(1)} ${medium.bookUnit === 'pages' ? 'Seiten' : 'Kapitel'}/Tag`;
    case 'movie':
      return '';
  }
}
