# Medienkonsum-Tracker

Trackt Videospiele, Serien, Bücher und Filme anhand einer bestehenden Google-Sheets-Tabelle.
Die App ist ein rein statisches React/Vite-Frontend und wird auf GitHub Pages gehostet.

## Architektur

- **Google Sheets** ist die einzige Datenquelle für Konsum-Einträge und wird nur lesend verwendet.
- **Google Identity Services** authentifiziert den Nutzer. Der OAuth-Zugriffstoken mit dem Scope
  `spreadsheets.readonly` wird direkt im Browser für die Google Sheets REST API verwendet.
- Es gibt keinen eigenen Server und keine Datenbank. Zugangsdaten werden nicht durch die App
  gespeichert.

Der Zugriffstoken läuft nach etwa einer Stunde ab und wird nicht persistiert. Nach einem Neuladen
der Seite muss man sich deshalb erneut anmelden.

## Einmalige Einrichtung

### 1. Google Cloud konfigurieren

1. In der [Google Cloud Console](https://console.cloud.google.com/) ein Projekt auswählen oder
   anlegen.
2. Unter **APIs & Dienste → Bibliothek** die **Google Sheets API** aktivieren.
3. Unter **APIs & Dienste → OAuth-Zustimmungsbildschirm** App-Name und Support-E-Mail eintragen.
   Den Scope `https://www.googleapis.com/auth/spreadsheets.readonly` hinzufügen. Bei einer App im
   Testmodus das verwendete Google-Konto unter **Testnutzer** eintragen.
4. Unter **APIs & Dienste → Anmeldedaten** eine **OAuth-Client-ID** vom Typ **Webanwendung**
   anlegen. Als autorisierte JavaScript-Ursprünge hinzufügen:
   - `http://localhost:5173`
   - `https://<dein-github-name>.github.io` für GitHub Pages

### 2. Google Sheet freigeben

Die Tabelle muss für das Google-Konto, mit dem man sich anmeldet, mindestens lesbar freigegeben
sein. Die Spreadsheet-ID steht im Freigabelink zwischen `/d/` und `/edit`.

### 3. Lokale Konfiguration

`.env.example` nach `.env` kopieren und die OAuth-Client-ID sowie die Spreadsheet-ID eintragen:

```
cp .env.example .env
```

```
VITE_GOOGLE_CLIENT_ID=1234567890-abcdef.apps.googleusercontent.com
VITE_SPREADSHEET_ID=1ahAu44ATis8FNeammO2kGm0ThXkb6KpETQQKqWHyFJQ
```

## Entwicklung

```
npm install
npm run dev
```

Der Dev-Server läuft unter `http://localhost:5173`.

## Deployment auf GitHub Pages

Der Workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) baut die App bei jedem
Push auf `main` und veröffentlicht sie über GitHub Pages.

1. Unter **Settings → Pages → Source** auf **GitHub Actions** umstellen.
2. Unter **Settings → Secrets and variables → Actions** diese Repository-Secrets einrichten:
   - `VITE_GOOGLE_CLIENT_ID`
   - `VITE_SPREADSHEET_ID`
3. Nach dem ersten Deployment die GitHub-Pages-URL als autorisierten JavaScript-Ursprung beim
   OAuth-Client hinterlegen.

## Notation in der Google-Tabelle

Die Erkennung der Einträge basiert auf festen Textmustern (siehe
`src/sheets/notationParsers.ts`), z. B. `"<Name> (<hh>:<mm>h)"` für Spiele oder
`"<Name>: <N> Kapitel gelesen"` für Bücher. Farben werden bewusst nicht ausgewertet.

## Häufige Probleme

| Symptom | Ursache | Lösung |
| --- | --- | --- |
| Anmeldung schlägt fehl | Aktueller Ursprung fehlt beim OAuth-Client | Autorisierten JavaScript-Ursprung prüfen |
| `access_denied` | Konto fehlt als Testnutzer | OAuth-Zustimmungsbildschirm prüfen |
| Tabelle lädt nicht, Fehler 403 | Sheets API nicht aktiviert oder Tabelle nicht freigegeben | API und Tabellenfreigabe prüfen |
| Nach Reload sind Daten weg | Der Zugriffstoken wird nicht persistiert | Erneut anmelden |