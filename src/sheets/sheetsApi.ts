import { spreadsheetId } from '../config/env';

interface SheetGrid {
  title: string;
  /** Row-major grid of cell text, already resolved to display strings. */
  values: string[][];
}

/** Thrown when the Google Sheets API rejects the request, typically due to an expired token. */
export class SheetsAuthError extends Error {}

// Thin wrapper around fetch for the Sheets API that turns auth failures into SheetsAuthError.
async function sheetsFetch(path: string, accessToken: string): Promise<unknown> {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401 || response.status === 403) {
    throw new SheetsAuthError('Zugriff auf Google Sheets abgelehnt. Bitte erneut anmelden.');
  }
  if (!response.ok) {
    throw new Error(`Google Sheets API Fehler (${response.status})`);
  }
  return response.json();
}

/** Fetches rows 1-100 of every sheet (year) in the spreadsheet, using the owner's OAuth token. */
export async function fetchAllYearSheets(accessToken: string): Promise<SheetGrid[]> {
  const metadata = (await sheetsFetch(`${spreadsheetId}`, accessToken)) as {
    sheets: { properties: { title: string } }[];
  };
  const titles = metadata.sheets.map((sheet) => sheet.properties.title);

  const ranges = titles.map((title) => `ranges=${encodeURIComponent(`'${title}'!1:100`)}`).join('&');
  const batch = (await sheetsFetch(
    `${spreadsheetId}/values:batchGet?${ranges}&dateTimeRenderOption=FORMATTED_STRING`,
    accessToken,
  )) as { valueRanges: { values?: string[][] }[] };

  return titles.map((title, index) => ({
    title,
    values: batch.valueRanges[index]?.values ?? [],
  }));
}
