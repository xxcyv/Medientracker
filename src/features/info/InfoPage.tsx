/** Kurze Einführung in die App, die neuen Nutzern beim ersten Anmelden angezeigt wird. */
export function InfoPage() {
  return (
    <div className="info-page">
      <section className="info-section">
        <h2>Über den Medientracker</h2>
        <p>
          Die App zeigt den Konsum von Videospielen, Serien, Büchern und Filmen an. Die Daten stammen
          aus einer Google-Tabelle und werden hier übersichtlich dargestellt. Die App zeigt die Daten
          ausschließlich an und verändert die Tabelle nicht.
        </p>
      </section>

      <section className="info-section">
        <h2>Liste</h2>
        <p>
          Zeigt alle erfassten Medien auf einen Blick. Über die Buttons oben lässt sich nach Kategorie
          filtern (z.&nbsp;B. nur Spiele oder nur Serien). Ein Klick auf einen Eintrag öffnet weitere
          Details, etwa die Anzahl der Tage, an denen das Medium genutzt wurde. Über das Lupensymbol
          lässt sich nach einem bestimmten Namen suchen. Mit „Gruppieren" lassen sich mehrere Einträge
          (z.&nbsp;B. Staffeln einer Serie) zu einem gemeinsamen Eintrag zusammenfassen.
        </p>
      </section>

      <section className="info-section">
        <h2>Kalender</h2>
        <p>
          Zeigt, was an welchem Tag konsumiert wurde. Oben lässt sich zwischen Tages-, Wochen- und
          Monatsansicht wechseln. Über die Pfeiltasten gelangt man zum vorherigen oder nächsten
          Zeitraum, der „Heute"-Button springt zurück zum aktuellen Datum.
        </p>
      </section>

      <section className="info-section">
        <h2>Statistiken</h2>
        <p>
          Stellt den Konsum als Diagramm dar. Die Ansicht lässt sich nach Kategorie und Zeitraum
          filtern, zum Beispiel auf die letzten 7 Tage oder ein ganzes Jahr. So werden Zeiten mit
          besonders viel oder wenig Konsum sichtbar.
        </p>
      </section>

      <section className="info-section">
        <h2>Export</h2>
        <p>
          Erstellt eine Textliste mit den Gesamtwerten aller Medien einer Kategorie, die
          heruntergeladen werden kann, zum Beispiel zur Archivierung oder zum Teilen.
        </p>
      </section>

      <section className="info-section">
        <h2>Weitere Hinweise</h2>
        <p>
          Über das Symbol oben rechts im Header lässt sich zwischen hellem und dunklem Design
          wechseln. Diese Seite ist jederzeit über den Menüpunkt „Info" ganz links erreichbar.
        </p>
      </section>
    </div>
  );
}
