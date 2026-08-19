import { CATEGORY_LABELS, formatDailyAmount } from '../../utils/format';
import { CATEGORY_COLORS } from '../../utils/categoryColors';
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
          <span className="day-entry-info">
            <span
              className="day-entry-category"
              style={{ backgroundColor: CATEGORY_COLORS[entry.category].base, color: CATEGORY_COLORS[entry.category].text }}
            >
              {CATEGORY_LABELS[entry.category]}
            </span>
            <span className="day-entry-name">{entry.mediumName}</span>
          </span>
          <span className="day-entry-amount">{formatDailyAmount(entry.mediumName, entry.category, entry.entry)}</span>
        </li>
      ))}
    </ul>
  );
}
