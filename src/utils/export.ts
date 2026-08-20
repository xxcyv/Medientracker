import type { Category, DailyEntry, Medium } from '../sheets/types';
import { computeStats } from '../sheets/aggregate';
import { CATEGORY_LABELS, formatExportStat } from './format';

/** The time scope for an export: every year, a single year, or a custom (ISO date, inclusive) range. */
export type ExportRange = 'all' | number | { start: string; end: string };

// Legacy entries have no exact date and are meant for the list view only, so they never match a range.
function entryMatchesRange(entry: DailyEntry, range: ExportRange): boolean {
  if (entry.legacy) return false;
  if (range === 'all') return true;
  if (entry.date === null) return false;
  if (typeof range === 'number') return Number(entry.date.slice(0, 4)) === range;
  return entry.date >= range.start && entry.date <= range.end;
}

/** Restricts a medium's entries to the given time range, or returns it unchanged for the "all years" scope. */
function filterMediumToRange(medium: Medium, range: ExportRange): Medium {
  const entries = medium.entries.filter((entry) => entryMatchesRange(entry, range));
  return { ...medium, entries };
}

/** Builds the "<Name>: <Statistik>" lines for one category and time range, sorted by total descending. */
export function buildExportLines(media: Medium[], category: Category, range: ExportRange): string[] {
  return media
    .filter((medium) => medium.category === category)
    .map((medium) => filterMediumToRange(medium, range))
    .map((medium) => ({ medium, stats: computeStats(medium) }))
    .filter(({ stats }) => stats.mainValue > 0)
    .sort((a, b) => b.stats.mainValue - a.stats.mainValue)
    .map(({ medium, stats }) => `${medium.name}: ${formatExportStat(medium, stats)}`);
}

/** Builds a descriptive filename for the export, based on category and time range. */
export function buildExportFilename(category: Category, range: ExportRange): string {
  const period = range === 'all' ? 'alle-jahre' : typeof range === 'number' ? String(range) : `${range.start}_bis_${range.end}`;
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
