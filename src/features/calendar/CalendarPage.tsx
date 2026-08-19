import { useMemo, useState } from 'react';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { useData } from '../../data/DataContext';
import { buildEntriesByDate } from '../../sheets/calendarUtils';
import { DayEntriesList } from './DayEntriesList';
import { CATEGORY_COLORS } from '../../utils/categoryColors';
import { asyncStateView } from '../../components/AsyncState';

type ViewMode = 'day' | 'week' | 'month';

/** Calendar view of daily media consumption, switchable between day, week and month granularity. */
export function CalendarPage() {
  const { media, loading, error } = useData();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const entriesByDate = useMemo(() => buildEntriesByDate(media), [media]);

  const asyncState = asyncStateView(loading, error);
  if (asyncState) return asyncState;

  // Moves the selected date by one unit (day/week/month) of the current view mode.
  function navigate(direction: -1 | 1) {
    setSelectedDate((current) => {
      if (viewMode === 'day') return addDays(current, direction);
      if (viewMode === 'week') return addWeeks(current, direction);
      return addMonths(current, direction);
    });
  }

  return (
    <div className="calendar-page">
      <div className="calendar-controls">
        <div className="view-mode-switch">
          {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
            <button key={mode} type="button" className={viewMode === mode ? 'active' : ''} onClick={() => setViewMode(mode)}>
              {mode === 'day' ? 'Tag' : mode === 'week' ? 'Woche' : 'Monat'}
            </button>
          ))}
        </div>
        <div className="calendar-navigation">
          <button type="button" onClick={() => navigate(-1)} aria-label="Zurück">
            ‹
          </button>
          <button type="button" onClick={() => setSelectedDate(new Date())}>
            Heute
          </button>
          <button type="button" onClick={() => navigate(1)} aria-label="Weiter">
            ›
          </button>
        </div>
      </div>

      {viewMode === 'day' && <DayView date={selectedDate} entriesByDate={entriesByDate} />}
      {viewMode === 'week' && <WeekView date={selectedDate} entriesByDate={entriesByDate} />}
      {viewMode === 'month' && (
        <MonthView date={selectedDate} entriesByDate={entriesByDate} onSelectDay={setSelectedDate} />
      )}
    </div>
  );
}

// Formats a date as the yyyy-MM-dd key used to index entriesByDate.
function toKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

// Shows the entries for a single day.
function DayView({ date, entriesByDate }: { date: Date; entriesByDate: ReturnType<typeof buildEntriesByDate> }) {
  return (
    <div className="day-view">
      <h2>{format(date, 'EEEE, d. MMMM yyyy', { locale: de })}</h2>
      <DayEntriesList entries={entriesByDate.get(toKey(date)) ?? []} />
    </div>
  );
}

// Shows one column per day for the week containing `date`.
function WeekView({ date, entriesByDate }: { date: Date; entriesByDate: ReturnType<typeof buildEntriesByDate> }) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="week-view">
      {days.map((day) => (
        <div key={toKey(day)} className="week-day">
          <h3>{format(day, 'EEEE, d.M.', { locale: de })}</h3>
          <DayEntriesList entries={entriesByDate.get(toKey(day)) ?? []} />
        </div>
      ))}
    </div>
  );
}

// Renders a month grid with per-day category dots plus the selected day's entries below.
function MonthView({
  date,
  entriesByDate,
  onSelectDay,
}: {
  date: Date;
  entriesByDate: ReturnType<typeof buildEntriesByDate>;
  onSelectDay: (day: Date) => void;
}) {
  const monthStart = startOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="month-view">
      <div className="month-grid">
        {days.map((day) => {
          const entries = entriesByDate.get(toKey(day)) ?? [];
          const mediaConsumed = new Map(entries.map((entry) => [entry.mediumName, entry.category]));
          return (
            <button
              key={toKey(day)}
              type="button"
              className={`month-day ${isSameMonth(day, date) ? '' : 'outside-month'} ${isSameDay(day, new Date()) ? 'today' : ''} ${isSameDay(day, date) ? 'selected' : ''}`}
              onClick={() => onSelectDay(day)}
            >
              <span className="month-day-number">{format(day, 'd')}</span>
              {mediaConsumed.size > 0 && (
                <span className="month-day-dots" aria-label={`${mediaConsumed.size} Einträge`}>
                  {Array.from(mediaConsumed, ([name, category]) => (
                    <span key={name} className="month-day-dot" style={{ backgroundColor: CATEGORY_COLORS[category].base }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="month-selected-day">
        <h3>{format(date, 'EEEE, d. MMMM yyyy', { locale: de })}</h3>
        <DayEntriesList entries={entriesByDate.get(toKey(date)) ?? []} />
      </div>
    </div>
  );
}
