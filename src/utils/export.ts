import type { Category, Medium } from '../sheets/types';
import { computeStats } from '../sheets/aggregate';
import { CATEGORY_LABELS, formatExportStat } from './format';

/** Restricts a medium's entries to one year, or returns it unchanged for the "all years" scope. */
function filterMediumToYear(medium: Medium, year: number | 'all'): Medium {
  // Legacy entries have no exact date and are meant for the list view only, so they never appear here.
  const entries = medium.entries.filter(
    (entry) => !entry.legacy && (year === 'all' || (entry.date !== null && Number(entry.date.slice(0, 4)) === year)),
  );
  return { ...medium, entries };
}

/** Builds the "<Name>: <Statistik>" lines for one category and time range, sorted by total descending. */
export function buildExportLines(media: Medium[], category: Category, year: number | 'all'): string[] {
  return media
    .filter((medium) => medium.category === category)
    .map((medium) => filterMediumToYear(medium, year))
    .map((medium) => ({ medium, stats: computeStats(medium) }))
    .filter(({ stats }) => stats.mainValue > 0)
    .sort((a, b) => b.stats.mainValue - a.stats.mainValue)
    .map(({ medium, stats }) => `${medium.name}: ${formatExportStat(medium, stats)}`);
}

/** Builds a descriptive filename for the export, based on category and time range. */
export function buildExportFilename(category: Category, year: number | 'all'): string {
  const period = year === 'all' ? 'alle-jahre' : String(year);
  return `${CATEGORY_LABELS[category]}_${period}.txt`;
}

/** Triggers a browser download of the given text content as a .txt file. */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
