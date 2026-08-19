import { extractYearFromSheetTitle, parseSheetDate } from './dateUtils';
import { parseLine, toDailyEntry } from './notationParsers';
import type { Category, DailyEntry } from './types';

export interface RawExtraction {
  name: string;
  category: Category;
  entry: DailyEntry;
}

const HEADER_ROW_INDEX = 1; // Row 2 (0-based) holds the "Datum"/"Freizeit" column labels.

/**
 * Finds every ("Datum", "Freizeit") column pair in a sheet's header row. Multiple pairs can
 * appear side by side (e.g. one pair per tracked person); each "Freizeit" column is paired with
 * the closest "Datum" column to its left.
 */
function findColumnPairs(headerRow: string[]): { dateCol: number; freizeitCol: number }[] {
  const pairs: { dateCol: number; freizeitCol: number }[] = [];
  let lastDateCol: number | null = null;

  headerRow.forEach((header, columnIndex) => {
    const label = header?.trim();
    if (label === 'Datum') {
      lastDateCol = columnIndex;
    } else if (label === 'Freizeit' && lastDateCol !== null) {
      pairs.push({ dateCol: lastDateCol, freizeitCol: columnIndex });
    }
  });

  return pairs;
}

/** Parses one sheet (one year) into a flat list of category-tagged daily entries. */
export function parseYearSheet(title: string, values: string[][]): RawExtraction[] {
  const headerRow = values[HEADER_ROW_INDEX] ?? [];
  const pairs = findColumnPairs(headerRow);
  if (pairs.length === 0) return [];

  const year = extractYearFromSheetTitle(title);
  const results: RawExtraction[] = [];

  for (const { dateCol, freizeitCol } of pairs) {
    let currentDate: string | null = null;

    // Rows below the header, up to and including row 100, are walked top to bottom so that a
    // "Freizeit" entry without its own date can inherit the closest date above it.
    for (let rowIndex = HEADER_ROW_INDEX + 1; rowIndex < Math.min(values.length, 100); rowIndex++) {
      const row = values[rowIndex];
      if (!row) continue;

      const dateCell = row[dateCol]?.trim();
      if (dateCell) {
        currentDate = parseSheetDate(dateCell, year);
      }

      const freizeitCell = row[freizeitCol]?.trim();
      if (!freizeitCell) continue;

      for (const line of freizeitCell.split('\n')) {
        const parsed = parseLine(line);
        if (!parsed) continue;

        const category: Category = parsed.category === 'criticalRole' ? 'series' : parsed.category;
        const { name, entry } = toDailyEntry(parsed, currentDate, line.trim());
        results.push({ name, category, entry });
      }
    }
  }

  return results;
}

/**
 * Finds every ("Jahre", "Freizeit", "Tage") column triple in the "Legacy" sheet's header row, the
 * same way findColumnPairs does for the "Datum"/"Freizeit" pairs used by the year sheets.
 */
function findLegacyColumnTriples(headerRow: string[]): { yearsCol: number; freizeitCol: number; tageCol: number }[] {
  const triples: { yearsCol: number; freizeitCol: number; tageCol: number }[] = [];
  let lastYearsCol: number | null = null;
  let lastFreizeitCol: number | null = null;

  headerRow.forEach((header, columnIndex) => {
    const label = header?.trim();
    if (label === 'Jahre') {
      lastYearsCol = columnIndex;
      lastFreizeitCol = null;
    } else if (label === 'Freizeit' && lastYearsCol !== null) {
      lastFreizeitCol = columnIndex;
    } else if (label === 'Tage' && lastYearsCol !== null && lastFreizeitCol !== null) {
      triples.push({ yearsCol: lastYearsCol, freizeitCol: lastFreizeitCol, tageCol: columnIndex });
      lastYearsCol = null;
      lastFreizeitCol = null;
    }
  });

  return triples;
}

// Parses the comma-separated "Jahre" cell into a list of years, ignoring anything unparsable.
function parseLegacyYears(cell: string | undefined): number[] {
  if (!cell) return [];
  return cell
    .replace(/\s+/g, '') // Strips stray whitespace around/inside the comma-separated list first.
    .split(',')
    .map((part) => Number(part))
    .filter((year) => Number.isFinite(year) && year > 0);
}

// Parses the "Tage" cell into a day count, defaulting to 0 when it can't be read as a number.
function parseLegacyDays(cell: string | undefined): number {
  const value = Number(cell?.trim().replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Parses the "Legacy" sheet, which has no per-day dates: each row's "Jahre"/"Tage" cells describe
 * the years and total days for the game(s) named in that row's "Freizeit" cell. Only video game
 * notation is expected here, so non-game lines are skipped.
 */
export function parseLegacySheet(values: string[][]): RawExtraction[] {
  const headerRow = values[HEADER_ROW_INDEX] ?? [];
  const triples = findLegacyColumnTriples(headerRow);
  if (triples.length === 0) return [];

  const results: RawExtraction[] = [];

  for (const { yearsCol, freizeitCol, tageCol } of triples) {
    for (let rowIndex = HEADER_ROW_INDEX + 1; rowIndex < Math.min(values.length, 100); rowIndex++) {
      const row = values[rowIndex];
      if (!row) continue;

      const freizeitCell = row[freizeitCol]?.trim();
      if (!freizeitCell) continue;

      const years = parseLegacyYears(row[yearsCol]);
      const days = parseLegacyDays(row[tageCol]);

      for (const line of freizeitCell.split('\n')) {
        const parsed = parseLine(line);
        if (!parsed || parsed.category !== 'game') continue;

        const { name, entry } = toDailyEntry(parsed, null, line.trim());
        entry.legacy = { years, days };
        results.push({ name, category: 'game', entry });
      }
    }
  }

  return results;
}
