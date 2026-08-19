import type { DailyEntry } from './types';

// Keywords that mark an entry as a drawing session, which must be ignored entirely.
const DRAWING_KEYWORDS = [
  'sketch',
  'skizze',
  'skizziert',
  'lineart',
  'coloring',
  'lighting',
  'shading',
  'zeichnung',
  'gezeichnet',
  'geübt',
  'gekritzelt',
  'herumgekritzelt',
  'begonnen',
  'fortgesetzt',
  'beendet',
].map((keyword) => keyword.toLowerCase());

// Checks whether a line's text matches any drawing-related keyword.
function isDrawingEntry(line: string): boolean {
  const lower = line.toLowerCase();
  return DRAWING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/** Result of successfully parsing one line of a "Freizeit" cell. */
export type ParsedLine =
  | { category: 'game'; name: string; minutes: number }
  | { category: 'series'; name: string; episodes: number }
  | { category: 'criticalRole'; episodeNumber: number | null }
  | { category: 'movie'; name: string }
  | { category: 'book'; name: string; chapters?: number; pages?: number };

// Matches an integer or a decimal number using either a comma or a dot as the decimal separator.
const NUMBER_PATTERN = '\\d+(?:[.,]\\d+)?';

const GAME_PATTERN = /^(.+?)\s*\((\d{1,2}):(\d{2})h\)$/;
const CRITICAL_ROLE_EPISODE_PATTERN = /^Critical Role:\s*C(\d+)E(\d+)\s*geschaut$/i;
const CRITICAL_ROLE_UNKNOWN_PATTERN = /^Critical Role\s*geschaut$/i;
const SERIES_EPISODES_PATTERN = new RegExp(`^(.+?):\\s*(${NUMBER_PATTERN})\\s*(?:Folgen?|Parts?)\\s*geschaut$`, 'i');
const MOVIE_PATTERN = /^(.+?)\s*geschaut$/i;
const BOOK_CHAPTERS_PATTERN = new RegExp(`^(.+?):\\s*(${NUMBER_PATTERN})\\s*Kapitel\\s*gelesen$`, 'i');
const BOOK_PAGES_PATTERN = new RegExp(`^(.+?):\\s*(${NUMBER_PATTERN})\\s*Seiten\\s*gelesen$`, 'i');

/** Parses a number that may use either a comma or a dot as the decimal separator. */
function parseFlexibleNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

/**
 * Parses a single line from a "Freizeit" cell into a category-specific entry, following the
 * fixed notation rules and priority order (Critical Role special cases before generic series,
 * series before movies, chapters before pages for books). Returns null for drawing entries or
 * lines that match no known notation.
 */
export function parseLine(line: string): ParsedLine | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('--') || isDrawingEntry(trimmed)) return null;

  // Critical Role must be checked before the generic series/movie patterns, since its fallback
  // notation ("Critical Role geschaut") would otherwise be mistaken for a movie entry.
  const criticalRoleEpisode = trimmed.match(CRITICAL_ROLE_EPISODE_PATTERN);
  if (criticalRoleEpisode) {
    return { category: 'criticalRole', episodeNumber: Number(criticalRoleEpisode[2]) };
  }
  if (CRITICAL_ROLE_UNKNOWN_PATTERN.test(trimmed)) {
    return { category: 'criticalRole', episodeNumber: null };
  }

  const seriesMatch = trimmed.match(SERIES_EPISODES_PATTERN);
  if (seriesMatch) {
    return { category: 'series', name: seriesMatch[1].trim(), episodes: parseFlexibleNumber(seriesMatch[2]) };
  }

  const bookChaptersMatch = trimmed.match(BOOK_CHAPTERS_PATTERN);
  if (bookChaptersMatch) {
    return { category: 'book', name: bookChaptersMatch[1].trim(), chapters: parseFlexibleNumber(bookChaptersMatch[2]) };
  }
  const bookPagesMatch = trimmed.match(BOOK_PAGES_PATTERN);
  if (bookPagesMatch) {
    return { category: 'book', name: bookPagesMatch[1].trim(), pages: parseFlexibleNumber(bookPagesMatch[2]) };
  }

  const gameMatch = trimmed.match(GAME_PATTERN);
  if (gameMatch) {
    return {
      category: 'game',
      name: gameMatch[1].trim(),
      minutes: Number(gameMatch[2]) * 60 + Number(gameMatch[3]),
    };
  }

  // Movies must be tried last among the "named" patterns, since "<Name> geschaut" is the most
  // generic shape and would otherwise swallow series/book entries that also end in "geschaut".
  const movieMatch = trimmed.match(MOVIE_PATTERN);
  if (movieMatch) {
    return { category: 'movie', name: movieMatch[1].trim() };
  }

  return null;
}

/** Converts a parsed line plus its resolved date into a normalized DailyEntry keyed by medium name. */
export function toDailyEntry(parsed: ParsedLine, date: string | null, raw: string): { name: string; entry: DailyEntry } {
  switch (parsed.category) {
    case 'game':
      return { name: parsed.name, entry: { date, amount: parsed.minutes, unit: 'minutes', raw } };
    case 'movie':
      return { name: parsed.name, entry: { date, amount: 1, unit: 'watch', raw } };
    case 'book':
      if (parsed.chapters !== undefined) {
        return { name: parsed.name, entry: { date, amount: parsed.chapters, unit: 'chapters', raw } };
      }
      return { name: parsed.name, entry: { date, amount: parsed.pages ?? 0, unit: 'pages', raw } };
    case 'criticalRole':
      return {
        name: 'Critical Role',
        entry: {
          date,
          amount: 0, // Episode count for Critical Role is derived later by grouping episode numbers.
          unit: 'episodes',
          episodeNumber: parsed.episodeNumber ?? undefined,
          raw,
        },
      };
    case 'series':
      return { name: parsed.name, entry: { date, amount: parsed.episodes, unit: 'episodes', raw } };
  }
}
