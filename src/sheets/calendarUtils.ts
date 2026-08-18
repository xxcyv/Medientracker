import type { Category, Medium } from './types';

export interface CalendarEntry {
  mediumName: string;
  category: Category;
  text: string;
}

/** Indexes every dated entry across all media by ISO date, for the calendar view. */
export function buildEntriesByDate(media: Medium[]): Map<string, CalendarEntry[]> {
  const byDate = new Map<string, CalendarEntry[]>();

  for (const medium of media) {
    for (const entry of medium.entries) {
      if (!entry.date) continue;
      const list = byDate.get(entry.date) ?? [];
      list.push({ mediumName: medium.name, category: medium.category, text: entry.raw });
      byDate.set(entry.date, list);
    }
  }

  return byDate;
}
