# Medienkonsum-Tracker

Trackt den Konsum von Videospielen, Serien, Büchern und Filmen anhand einer bestehenden Google-Sheets-Tabelle und bietet einfache Statistiken an.
Die App ist ein rein statisches React/Vite-Frontend und wird auf GitHub Pages gehostet.

## Funktionen

- **Liste**: Übersicht aller getrackten Medien, per Tab nach Kategorie gefiltert (Videospiele,
  Serien, Bücher, Filme, oder alle zusammen). Jeder Eintrag zeigt direkt seine Kennzahl passend zur
  Kategorie an – Gesamtspielzeit bei Spielen, Anzahl geschauter Folgen bei Serien, gelesene Kapitel
  oder Seiten bei Büchern, Anzahl der Sichtungen bei Filmen. Ein Klick auf einen Eintrag klappt
  Detailinfos wie konsumierte Tage, Durchschnitt pro Tag und die Jahre, in denen das Medium
  konsumiert wurde, auf. Über den "Gruppieren"-Modus lassen sich mehrere Medien einer Kategorie
  (z.B. die Bände einer Buchreihe oder Staffeln einer Serie) zu einem gemeinsamen Eintrag mit einem
  selbst vergebenen Namen zusammenfassen; ihre Werte werden dann addiert dargestellt. Eine
  Gruppierung lässt sich jederzeit wieder in ihre einzelnen Medien auflösen. Gruppen werden nur
  lokal im Browser gespeichert (`localStorage`) und nicht in der Google-Tabelle abgelegt, sind also
  gerätespezifisch.
- **Kalender**: Zeigt an, was an welchem Tag konsumiert wurde – wahlweise als Tages-, Wochen- oder
  Monatsansicht. Jeder Tag mit Einträgen listet die betroffenen Medien mit ihrer jeweiligen
  Tagesmenge (z.B. Spielzeit, Anzahl gelesener Kapitel oder geschauter Folgen) auf, farblich nach
  Kategorie hervorgehoben. Über Pfeiltasten lässt sich zum vorherigen bzw. nächsten Zeitraum
  springen, ein "Heute"-Button kehrt direkt zum aktuellen Datum zurück.
- **Statistiken**: Stellt den Konsum als Balkendiagramm dar und lässt sich nach Kategorie sowie
  Zeitraum filtern – etwa die letzten 7 Tage, der aktuelle Monat, die letzten 3 Monate, ein
  bestimmtes Jahr oder die gesamte Historie. In der Jahresansicht kann die Aufteilung der Balken
  zusätzlich zwischen Monat, Kalenderwoche und Tag umgeschaltet werden, um Trends unterschiedlich
  fein aufzulösen.
- **Export**: Erstellt aus den Gesamtwerten aller Medien einer gewählten Kategorie und eines
  gewählten Zeitraums (einzelnes Jahr oder gesamte Historie) eine lesbare Textliste, die sich mit
  einem Klick als `.txt`-Datei herunterladen lässt, z.B. um sie andernorts zu archivieren oder zu
  teilen.
- **Legacy-Einträge**: Videospielzeiten aus der Zeit vor der taggenauen Erfassung können über ein
  separates "Legacy"-Tabellenblatt ohne exakte Daten eingepflegt werden – pro Zeile nur mit den
  betroffenen Jahren und der Gesamtzahl an Tagen. Diese Einträge fließen in die Gesamtspielzeit und
  die Liste der konsumierten Jahre eines Mediums ein, tauchen aber mangels Datum nicht im Kalender
  auf und werden bei Export und Statistiken nicht in zeitlich eingeschränkten Zeiträumen berücksichtigt.
- **Tag-/Nacht-Modus**: Die Oberfläche übernimmt beim Start automatisch die Systemeinstellung des
  Geräts und lässt sich jederzeit über einen Button im Header manuell umschalten.
- **Google-Anmeldung**: Der Zugriff auf die Daten erfolgt ausschließlich über eine Anmeldung mit
  einem Google-Konto, das lesenden Zugriff auf die konfigurierte Tabelle hat. Es gibt keine eigene
  Nutzerverwaltung und keine Speicherung von Zugangsdaten durch die App.

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
`src/sheets/notationParsers.ts`), z.B. `"<Name> (<hh>:<mm>h)"` für Spiele oder
`"<Name>: <N> Kapitel gelesen"` für Bücher. Farben werden bewusst nicht ausgewertet.

Das Tabellenblatt `Legacy` folgt einer eigenen Struktur: statt einer `Datum`-Spalte gibt es pro
Spiel-Block die Spalten `Jahre` (kommagetrennte Liste betroffener Jahre), `Freizeit` (Name in
gewohnter Notation, ohne Zeitangabe) und `Tage` (Gesamtzahl konsumierter Tage). Nur
Spiele-Notation wird hier ausgewertet.

## Häufige Probleme

| Symptom | Ursache | Lösung |
| --- | --- | --- |
| Anmeldung schlägt fehl | Aktueller Ursprung fehlt beim OAuth-Client | Autorisierten JavaScript-Ursprung prüfen |
| `access_denied` | Konto fehlt als Testnutzer | OAuth-Zustimmungsbildschirm prüfen |
| Tabelle lädt nicht, Fehler 403 | Sheets API nicht aktiviert oder Tabelle nicht freigegeben | API und Tabellenfreigabe prüfen |
| Nach Reload sind Daten weg | Der Zugriffstoken wird nicht persistiert | Erneut anmelden |
| Gruppen fehlen auf einem anderen Gerät/Browser | Gruppen werden nur lokal (`localStorage`) gespeichert | Gruppe dort erneut anlegen |