// Parses date strings as they come from the Google Sheets API (rendered with
// dateTimeRenderOption "FORMATTED_STRING"), which follows the spreadsheet's locale format
// (German day.month[.year]). Falls back to the sheet's own year if none is given in the cell.
const FULL_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/;
const SHORT_DATE_PATTERN = /^(\d{1,2})\.(\d{1,2})\.?$/;

export function parseSheetDate(raw: string, sheetYear: number): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const full = trimmed.match(FULL_DATE_PATTERN);
  if (full) {
    const [, day, month, yearPart] = full;
    const year = yearPart.length === 2 ? 2000 + Number(yearPart) : Number(yearPart);
    return toIsoDate(year, Number(month), Number(day));
  }

  const short = trimmed.match(SHORT_DATE_PATTERN);
  if (short) {
    const [, day, month] = short;
    return toIsoDate(sheetYear, Number(month), Number(day));
  }

  return null;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Extracts the year from a sheet title, e.g. "2024" or "Jahr 2024" -> 2024. */
export function extractYearFromSheetTitle(title: string): number {
  const match = title.match(/\d{4}/);
  return match ? Number(match[0]) : new Date().getFullYear();
}
