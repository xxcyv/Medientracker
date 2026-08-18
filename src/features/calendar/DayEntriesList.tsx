import { CATEGORY_LABELS } from '../../utils/format';
import type { CalendarEntry } from '../../sheets/calendarUtils';

interface DayEntriesListProps {
  entries: CalendarEntry[];
}

/** Renders the media consumed on a single day, grouped by category. */
export function DayEntriesList({ entries }: DayEntriesListProps) {
  if (entries.length === 0) return <p className="day-empty">Keine Einträge.</p>;

  return (
    <ul className="day-entries">
      {entries.map((entry, index) => (
        <li key={index}>
          <span className="day-entry-category">{CATEGORY_LABELS[entry.category]}</span>
          <span className="day-entry-text">{entry.text}</span>
        </li>
      ))}
    </ul>
  );
}
