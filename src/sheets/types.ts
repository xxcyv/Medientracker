// The four supported media categories. A medium always belongs to exactly one of these.
export type Category = 'game' | 'series' | 'book' | 'movie';

// Unit used to express the amount consumed on a single day, depending on the category.
export type AmountUnit = 'minutes' | 'episodes' | 'chapters' | 'pages' | 'watch';

/** A single day's worth of consumption of one medium, extracted from one line of a sheet cell. */
export interface DailyEntry {
  /** ISO date string (yyyy-MM-dd), or null if no date could be determined for this entry. */
  date: string | null;
  amount: number;
  unit: AmountUnit;
  /** Only set for Critical Role entries where the episode number itself was given. */
  episodeNumber?: number;
  /** Original raw text, kept for debugging/troubleshooting parsing issues. */
  raw: string;
}

/** One tracked instance of a game, series, book or movie, identified uniquely by its name. */
export interface Medium {
  name: string;
  category: Category;
  entries: DailyEntry[];
  /** For books only: whether progress is tracked in chapters or pages. */
  bookUnit?: 'chapters' | 'pages';
}

/** Computed statistics for a medium, derived from its entries. */
export interface MediumStats {
  /** Main headline number: play time (games), episodes (series), chapters/pages (books), watch count (movies). */
  mainValue: number;
  /** Number of distinct days on which the medium was consumed (undefined for movies). */
  daysConsumed?: number;
  /** Average amount per day consumed, ignoring entries without a date (undefined for movies). */
  averagePerDay?: number;
}
