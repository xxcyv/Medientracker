// Central place for reading build-time configuration from Vite env variables.
// See `.env.example` for the required variables and where to obtain them.
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export const spreadsheetId = import.meta.env.VITE_SPREADSHEET_ID as string;
