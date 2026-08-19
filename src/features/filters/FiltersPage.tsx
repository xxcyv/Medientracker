import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  getDayOfYear,
  getDaysInYear,
  getISOWeek,
  getISOWeeksInYear,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { useData } from '../../data/DataContext';
import { useCategoryFilter } from '../../state/CategoryFilterContext';
import { ALL_CATEGORIES, CATEGORY_LABELS, formatMinutes } from '../../utils/format';
import { CATEGORY_CHART_COLORS } from '../../utils/categoryColors';
import { asyncStateView } from '../../components/AsyncState';
import type { Category, Medium } from '../../sheets/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Preset = 'last7Days' | 'thisMonth' | 'last3Months' | 'allTime' | 'custom' | `year-${number}`;

function presetRange(preset: Exclude<Preset, 'custom'>): { from: Date; to: Date } {
  const now = new Date();
  if (preset.startsWith('year-')) {
    const year = Number(preset.slice('year-'.length));
    return { from: new Date(year, 0, 1), to: endOfYear(new Date(year, 0, 1)) };
  }
  if (preset === 'last7Days') return { from: subDays(now, 6), to: now };
  if (preset === 'thisMonth') return { from: startOfMonth(now), to: endOfMonth(now) };
  if (preset === 'last3Months') return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
  return { from: new Date(2000, 0, 1), to: endOfYear(now) };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

type Statistic = 'overview' | 'yearly';
type Granularity = 'month' | 'week' | 'day';

/** Number of buckets the yearly chart is split into for a given year and granularity. */
function bucketCount(year: number, granularity: Granularity): number {
  if (granularity === 'month') return 12;
  if (granularity === 'week') return getISOWeeksInYear(new Date(year, 5, 1));
  return getDaysInYear(new Date(year, 0, 1));
}

/** Maps a date to its bucket index within its year, for the given granularity. */
function bucketIndex(date: Date, granularity: Granularity, bucketsInYear: number): number {
  if (granularity === 'month') return date.getMonth();
  // ISO weeks can straddle year boundaries; clamp so edge dates don't overflow the bucket array.
  if (granularity === 'week') return Math.min(getISOWeek(date) - 1, bucketsInYear - 1);
  return getDayOfYear(date) - 1;
}

/** Builds the x-axis labels for the yearly chart, one per bucket. */
function bucketLabels(year: number, granularity: Granularity): string[] {
  const count = bucketCount(year, granularity);
  if (granularity === 'month') return MONTH_LABELS;
  if (granularity === 'week') return Array.from({ length: count }, (_, index) => `KW ${index + 1}`);
  return Array.from({ length: count }, (_, index) => format(addDays(new Date(year, 0, 1), index), 'dd.MM.'));
}

/** Picks "Kapitel" or "Seiten" depending on which unit the majority of the given books use. */
function bookUnitLabel(books: Medium[]): string {
  const pagesCount = books.filter((medium) => medium.bookUnit === 'pages').length;
  const chaptersCount = books.filter((medium) => medium.bookUnit === 'chapters').length;
  return pagesCount > chaptersCount ? 'Seiten' : 'Kapitel';
}

/** Lowercases only a leading adjective (e.g. "Aufrufe" -> "aufrufe") so the noun stays capitalized when the label is inlined into a sentence. */
function toInlineLabel(label: string): string {
  const [first, ...rest] = label.split(' ');
  return rest.length === 0 ? first : [first.toLowerCase(), ...rest].join(' ');
}

/** Returns the unit label matching a category's amounts, so the chart and summary are self-explanatory. */
function valueLabelForCategory(category: Category, filteredMedia: Medium[]): string {
  switch (category) {
    case 'game':
      return 'Spielzeit';
    case 'series':
      return 'Folgen';
    case 'book':
      return bookUnitLabel(filteredMedia);
    case 'movie':
      return 'Aufrufe';
  }
}

/** Lets the user filter tracked entries by category and time range and view the results as a chart. */
export function FiltersPage() {
  const { media, loading, error } = useData();
  const { overviewCategory: category, setOverviewCategory: setCategory, yearlyCategory, setYearlyCategory } =
    useCategoryFilter();
  const [statistic, setStatistic] = useState<Statistic>('overview');
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [customFrom, setCustomFrom] = useState(() => format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('month');

  // Resolves the active preset (or the custom date inputs) into a concrete from/to date range.
  const range = useMemo(() => {
    if (preset === 'custom') {
      const from = startOfDay(parseISO(customFrom));
      const to = parseISO(customTo);
      return { from, to: to < from ? from : to };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo]);

  // Keeps the end date from ever landing before the start date, whichever field the user edits.
  function handleCustomFromChange(value: string) {
    setCustomFrom(value);
    if (customTo < value) setCustomTo(value);
  }

  function handleCustomToChange(value: string) {
    setCustomTo(value < customFrom ? customFrom : value);
  }

  // Collects all years with any tracked data, newest first, for the year preset/selector.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const medium of media) {
      for (const entry of medium.entries) {
        if (entry.date) years.add(parseISO(entry.date).getFullYear());
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [media]);

  // Falls back to the most recent available year if the user hasn't picked one yet.
  const effectiveYear = selectedYear ?? availableYears[0] ?? new Date().getFullYear();

  // Builds the overview chart data (labels/values) for the selected category and date range.
  const chartData = useMemo(() => {
    const filteredMedia = category === 'all' ? media : media.filter((medium) => medium.category === category);

    if (category === 'all') {
      // Amounts are not comparable across categories (minutes vs. episodes vs. chapters), so the
      // overview chart instead shows how many distinct days each category was consumed on.
      const daysPerCategory = new Map<Category, Set<string>>();
      for (const cat of ALL_CATEGORIES) daysPerCategory.set(cat, new Set());
      for (const medium of filteredMedia) {
        for (const entry of medium.entries) {
          if (!entry.date || !isWithinInterval(parseISO(entry.date), { start: startOfDay(range.from), end: endOfDay(range.to) })) {
            continue;
          }
          daysPerCategory.get(medium.category)?.add(entry.date);
        }
      }
      return {
        labels: ALL_CATEGORIES.map((cat) => CATEGORY_LABELS[cat]),
        values: ALL_CATEGORIES.map((cat) => daysPerCategory.get(cat)?.size ?? 0),
        valueLabel: 'Tage',
      };
    }

    const totalsByMedium = filteredMedia
      .map((medium) => {
        const total = medium.entries
          .filter(
            (entry) =>
              entry.date && isWithinInterval(parseISO(entry.date), { start: startOfDay(range.from), end: endOfDay(range.to) }),
          )
          .reduce((sum, entry) => sum + entry.amount, 0);
        return { name: medium.name, total };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    return {
      labels: totalsByMedium.map((item) => item.name),
      values: totalsByMedium.map((item) => item.total),
      valueLabel: valueLabelForCategory(category, filteredMedia),
    };
  }, [media, category, range]);

  const totalSum = chartData.values.reduce((sum, value) => sum + value, 0);

  const yearlyLabels = useMemo(() => bucketLabels(effectiveYear, granularity), [effectiveYear, granularity]);

  // Builds the yearly chart data, bucketed by month/week/day for the selected year.
  const yearlyChartData = useMemo(() => {
    const bucketsInYear = yearlyLabels.length;

    if (yearlyCategory === 'all') {
      // Same reasoning as the "all" overview: amounts aren't comparable across categories, so
      // this shows distinct days consumed per bucket, one series per category.
      const daysPerCategoryBucket = new Map<Category, Set<string>[]>();
      for (const cat of ALL_CATEGORIES) {
        daysPerCategoryBucket.set(
          cat,
          Array.from({ length: bucketsInYear }, () => new Set<string>()),
        );
      }
      for (const medium of media) {
        for (const entry of medium.entries) {
          if (!entry.date) continue;
          const date = parseISO(entry.date);
          if (date.getFullYear() !== effectiveYear) continue;
          daysPerCategoryBucket.get(medium.category)?.[bucketIndex(date, granularity, bucketsInYear)].add(entry.date);
        }
      }
      return {
        datasets: ALL_CATEGORIES.map((cat) => ({
          label: CATEGORY_LABELS[cat],
          data: (daysPerCategoryBucket.get(cat) ?? []).map((days) => days.size),
          backgroundColor: CATEGORY_CHART_COLORS[cat],
        })),
        valueLabel: 'Tage',
      };
    }

    const filteredMedia = media.filter((medium) => medium.category === yearlyCategory);
    const totalsByBucket = Array<number>(bucketsInYear).fill(0);
    for (const medium of filteredMedia) {
      for (const entry of medium.entries) {
        if (!entry.date) continue;
        const date = parseISO(entry.date);
        if (date.getFullYear() !== effectiveYear) continue;
        totalsByBucket[bucketIndex(date, granularity, bucketsInYear)] += entry.amount;
      }
    }
    const valueLabel = valueLabelForCategory(yearlyCategory, filteredMedia);
    return {
      datasets: [{ label: valueLabel, data: totalsByBucket, backgroundColor: CATEGORY_CHART_COLORS[yearlyCategory] }],
      valueLabel,
    };
  }, [media, yearlyCategory, effectiveYear, granularity, yearlyLabels]);

  const yearlyTotalSum = yearlyChartData.datasets.reduce(
    (sum, dataset) => sum + dataset.data.reduce((inner, value) => inner + value, 0),
    0,
  );

  const asyncState = asyncStateView(loading, error);
  if (asyncState) return asyncState;

  return (
    <div className="filters-page">
      <div className="statistic-tabs" role="tablist">
        <button type="button" className={statistic === 'overview' ? 'active' : ''} onClick={() => setStatistic('overview')}>
          Übersicht
        </button>
        <button type="button" className={statistic === 'yearly' ? 'active' : ''} onClick={() => setStatistic('yearly')}>
          Jahresübersicht
        </button>
      </div>

      {statistic === 'overview' && (
        <>
          <div className="filters-controls">
            <label>
              Kategorie
              <select value={category} onChange={(event) => setCategory(event.target.value as Category | 'all')}>
                <option value="all">Alle</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Zeitraum
              <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
                <option value="last7Days">Letzte 7 Tage</option>
                <option value="thisMonth">Dieser Monat</option>
                <option value="last3Months">Letzte 3 Monate</option>
                {availableYears.map((year) => (
                  <option key={year} value={`year-${year}`}>
                    {year}
                  </option>
                ))}
                <option value="allTime">Gesamter Zeitraum</option>
                <option value="custom">Eigener Zeitraum</option>
              </select>
            </label>
            {preset === 'custom' && (
              <>
                <label>
                  Von
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={(event) => handleCustomFromChange(event.target.value)}
                  />
                </label>
                <label>
                  Bis
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    onChange={(event) => handleCustomToChange(event.target.value)}
                  />
                </label>
              </>
            )}
          </div>

          <p className="filters-summary">
            {category === 'game' ? formatMinutes(totalSum) : totalSum} {toInlineLabel(chartData.valueLabel)} insgesamt
          </p>

          <Bar
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  label: chartData.valueLabel,
                  data: chartData.values,
                  backgroundColor:
                    category === 'all' ? ALL_CATEGORIES.map((cat) => CATEGORY_CHART_COLORS[cat]) : CATEGORY_CHART_COLORS[category],
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip:
                  category === 'game' ? { callbacks: { label: (context) => formatMinutes(context.parsed.y ?? 0) } } : undefined,
              },
              scales: category === 'game' ? { y: { ticks: { callback: (value) => formatMinutes(Number(value)) } } } : undefined,
            }}
          />
        </>
      )}

      {statistic === 'yearly' && (
        <>
          <div className="filters-controls">
            <label>
              Kategorie
              <select
                value={yearlyCategory}
                onChange={(event) => setYearlyCategory(event.target.value as Category | 'all')}
              >
                <option value="all">Alle</option>
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Jahr
              <select value={effectiveYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {availableYears.length === 0 && <option value={effectiveYear}>{effectiveYear}</option>}
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Anzeige
              <select value={granularity} onChange={(event) => setGranularity(event.target.value as Granularity)}>
                <option value="month">Pro Monat</option>
                <option value="week">Pro Woche</option>
                <option value="day">Pro Tag</option>
              </select>
            </label>
          </div>

          <p className="filters-summary">
            {yearlyCategory === 'game' ? formatMinutes(yearlyTotalSum) : yearlyTotalSum}{' '}
            {toInlineLabel(yearlyChartData.valueLabel)} in {effectiveYear}
          </p>

          <Bar
            data={{
              labels: yearlyLabels,
              datasets: yearlyChartData.datasets,
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: yearlyCategory === 'all' },
                tooltip:
                  yearlyCategory === 'game'
                    ? { callbacks: { label: (context) => formatMinutes(context.parsed.y ?? 0) } }
                    : undefined,
              },
              scales:
                yearlyCategory === 'game' ? { y: { ticks: { callback: (value) => formatMinutes(Number(value)) } } } : undefined,
            }}
          />
        </>
      )}
    </div>
  );
}

