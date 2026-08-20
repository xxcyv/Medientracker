import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [pickerOpen, setPickerOpen] = useState(false);

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
          <div className="date-picker-anchor">
            <button
              type="button"
              className="date-picker-trigger"
              aria-label="Datum auswählen"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
            >
              <CalendarIcon />
            </button>
            {pickerOpen && (
              <DatePickerPopup
                date={selectedDate}
                onSelect={setSelectedDate}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>
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

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
    </svg>
  );
}

// Small month picker popup that lets the user jump directly to any date.
function DatePickerPopup({
  date,
  onSelect,
  onClose,
}: {
  date: Date;
  onSelect: (day: Date) => void;
  onClose: () => void;
}) {
  const [viewDate, setViewDate] = useState(date);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Closes the popup on an outside click or Escape, like a native dropdown/dialog.
    function handlePointerDown(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="date-picker-popup" role="dialog" aria-label="Datum auswählen" ref={popupRef}>
      <div className="date-picker-header">
        <button type="button" onClick={() => setViewDate((current) => addMonths(current, -1))} aria-label="Vorheriger Monat">
          ‹
        </button>
        <span>{format(viewDate, 'MMMM yyyy', { locale: de })}</span>
        <button type="button" onClick={() => setViewDate((current) => addMonths(current, 1))} aria-label="Nächster Monat">
          ›
        </button>
      </div>
      <div className="date-picker-weekdays">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="date-picker-grid">
        {days.map((day) => (
          <button
            key={toKey(day)}
            type="button"
            className={`date-picker-day ${isSameMonth(day, viewDate) ? '' : 'outside-month'} ${isSameDay(day, date) ? 'selected' : ''} ${isSameDay(day, new Date()) ? 'today' : ''}`}
            onClick={() => {
              onSelect(day);
              onClose();
            }}
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
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
      <h2 className="month-view-title">{format(date, 'MMMM yyyy', { locale: de })}</h2>
      <div className="month-grid">
        {days.map((day) => {
          const entries = entriesByDate.get(toKey(day)) ?? [];
          // Deduplicated by medium name so each medium contributes only one dot, even with multiple entries that day.
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
