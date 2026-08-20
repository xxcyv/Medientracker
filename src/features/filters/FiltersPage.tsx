import { useEffect, useMemo, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  ArcElement,
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
import { useTheme } from '../../theme/ThemeContext';
import { ALL_CATEGORIES, CATEGORY_LABELS, formatMinutes } from '../../utils/format';
import { CATEGORY_CHART_COLORS } from '../../utils/categoryColors';
import { asyncStateView } from '../../components/AsyncState';
import type { Category, Medium } from '../../sheets/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

type Preset = 'last7Days' | 'thisMonth' | 'last3Months' | 'allTime' | 'custom' | `year-${number}`;

// Resolves a named preset into its concrete from/to date range.
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
type EntryLimit = 5 | 10 | 15 | 'all';
const ENTRY_LIMIT_OPTIONS: EntryLimit[] = [5, 10, 15, 'all'];
type ChartType = 'bar' | 'pie';

/** Generates N evenly distinguishable colors (golden-angle hue rotation) for pie slices that don't already have a fixed category color. */
function generateSlicePalette(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `hsl(${Math.round((index * 137.508) % 360)}, 65%, 55%)`);
}

/** Converts raw values into percentages of their total, for the pie chart view. */
function toPercentages(values: number[], total: number): number[] {
  return values.map((value) => (total > 0 ? (value / total) * 100 : 0));
}

// Tooltip formatter shared by all pie charts, showing each slice's percentage share.
const PIE_TOOLTIP = {
  callbacks: { label: (context: { label?: string; parsed?: number }) => `${context.label}: ${(context.parsed ?? 0).toFixed(1)}%` },
};

/** One overview bar chart's worth of data; `title` is set when a category was split into sub-charts (e.g. book units). */
type ChartSection = {
  key: string;
  title?: string;
  labels: string[];
  values: number[];
  valueLabel: string;
};

/** One yearly bar chart's worth of data; `title` is set when a category was split into sub-charts (e.g. book units). */
type YearlySection = {
  key: string;
  title?: string;
  datasets: { label: string; data: number[]; backgroundColor: string | string[] }[];
  valueLabel: string;
};

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

/** Splits books into chapter- and page-tracked groups; only returns two groups if both are non-empty (else null). */
function splitBooksByUnit(books: Medium[]): { chapters: Medium[]; pages: Medium[] } | null {
  const chapters = books.filter((medium) => medium.bookUnit === 'chapters');
  const pages = books.filter((medium) => medium.bookUnit === 'pages');
  return chapters.length > 0 && pages.length > 0 ? { chapters, pages } : null;
}

/** Lets the user filter tracked entries by category and time range and view the results as a chart. */
export function FiltersPage() {
  const { media, loading, error } = useData();
  const { overviewCategory: category, setOverviewCategory: setCategory, yearlyCategory, setYearlyCategory } =
    useCategoryFilter();
  const { theme } = useTheme();
  const [statistic, setStatistic] = useState<Statistic>('overview');
  const [chartType, setChartType] = useState<ChartType>('bar');

  // Chart.js draws to a canvas, so it can't pick up CSS variables; keep its label/grid colors in sync with the theme.
  useEffect(() => {
    ChartJS.defaults.color = theme === 'dark' ? '#eceef2' : '#1b1b1f';
    ChartJS.defaults.borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)';
  }, [theme]);
  const [preset, setPreset] = useState<Preset>('thisMonth');
  const [customFrom, setCustomFrom] = useState(() => format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [entryLimit, setEntryLimit] = useState<EntryLimit>(15);

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

  // Builds one bar-chart's worth of labels/values/totals for the given media, optionally under a sub-heading.
  function buildOverviewSection(mediaGroup: Medium[], cat: Category, title?: string): ChartSection {
    const totalsByMedium = mediaGroup
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
      .slice(0, entryLimit === 'all' ? undefined : entryLimit);

    return {
      key: title ?? cat,
      title,
      labels: totalsByMedium.map((item) => item.name),
      values: totalsByMedium.map((item) => item.total),
      valueLabel: title ?? valueLabelForCategory(cat, mediaGroup),
    };
  }

  // Builds the overview chart sections for the selected category and date range. Books are split
  // into separate "Kapitel"/"Seiten" sections when both units occur, since their amounts aren't comparable.
  const chartSections = useMemo<ChartSection[]>(() => {
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
      return [
        {
          key: 'all',
          labels: ALL_CATEGORIES.map((cat) => CATEGORY_LABELS[cat]),
          values: ALL_CATEGORIES.map((cat) => daysPerCategory.get(cat)?.size ?? 0),
          valueLabel: 'Tage',
        },
      ];
    }

    if (category === 'book') {
      const split = splitBooksByUnit(filteredMedia);
      if (split) {
        return [
          buildOverviewSection(split.chapters, category, 'Kapitel'),
          buildOverviewSection(split.pages, category, 'Seiten'),
        ];
      }
    }

    return [buildOverviewSection(filteredMedia, category)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, category, range, entryLimit]);

  const yearlyLabels = useMemo(() => bucketLabels(effectiveYear, granularity), [effectiveYear, granularity]);

  // Builds one bar-chart's worth of monthly/weekly/daily totals for the given media, optionally under a sub-heading.
  function buildYearlySection(mediaGroup: Medium[], cat: Category, bucketsInYear: number, title?: string): YearlySection {
    const totalsByBucket = Array<number>(bucketsInYear).fill(0);
    for (const medium of mediaGroup) {
      for (const entry of medium.entries) {
        if (!entry.date) continue;
        const date = parseISO(entry.date);
        if (date.getFullYear() !== effectiveYear) continue;
        totalsByBucket[bucketIndex(date, granularity, bucketsInYear)] += entry.amount;
      }
    }
    const valueLabel = title ?? valueLabelForCategory(cat, mediaGroup);
    return {
      key: title ?? cat,
      title,
      datasets: [{ label: valueLabel, data: totalsByBucket, backgroundColor: CATEGORY_CHART_COLORS[cat] }],
      valueLabel,
    };
  }

  // Builds the yearly chart sections, bucketed by month/week/day for the selected year. Books are split
  // into separate "Kapitel"/"Seiten" sections when both units occur, since their amounts aren't comparable.
  const yearlySections = useMemo<YearlySection[]>(() => {
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
      return [
        {
          key: 'all',
          datasets: ALL_CATEGORIES.map((cat) => ({
            label: CATEGORY_LABELS[cat],
            data: (daysPerCategoryBucket.get(cat) ?? []).map((days) => days.size),
            backgroundColor: CATEGORY_CHART_COLORS[cat],
          })),
          valueLabel: 'Tage',
        },
      ];
    }

    const filteredMedia = media.filter((medium) => medium.category === yearlyCategory);

    if (yearlyCategory === 'book') {
      const split = splitBooksByUnit(filteredMedia);
      if (split) {
        return [
          buildYearlySection(split.chapters, yearlyCategory, bucketsInYear, 'Kapitel'),
          buildYearlySection(split.pages, yearlyCategory, bucketsInYear, 'Seiten'),
        ];
      }
    }

    return [buildYearlySection(filteredMedia, yearlyCategory, bucketsInYear)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media, yearlyCategory, effectiveYear, granularity, yearlyLabels]);

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

      <div className="statistic-tabs" role="tablist">
        <button type="button" className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')}>
          Balkendiagramm
        </button>
        <button type="button" className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')}>
          Kreisdiagramm
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
            {category !== 'all' && (
              <label>
                Anzahl Einträge
                <select
                  value={entryLimit}
                  onChange={(event) => setEntryLimit((event.target.value === 'all' ? 'all' : Number(event.target.value)) as EntryLimit)}
                >
                  {ENTRY_LIMIT_OPTIONS.map((limit) => (
                    <option key={limit} value={limit}>
                      {limit === 'all' ? 'Alle' : limit}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {chartSections.map((section) => {
            const sectionTotal = section.values.reduce((sum, value) => sum + value, 0);
            return (
              <div key={section.key} className="filters-chart-section">
                {section.title && <h3>{section.title}</h3>}
                <p className="filters-summary">
                  {category === 'game' ? formatMinutes(sectionTotal) : sectionTotal} {toInlineLabel(section.valueLabel)} insgesamt
                </p>

                {chartType === 'bar' ? (
                  <Bar
                    data={{
                      labels: section.labels,
                      datasets: [
                        {
                          label: section.valueLabel,
                          data: section.values,
                          backgroundColor:
                            category === 'all'
                              ? ALL_CATEGORIES.map((cat) => CATEGORY_CHART_COLORS[cat])
                              : CATEGORY_CHART_COLORS[category],
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
                ) : (
                  <Pie
                    data={{
                      labels: section.labels,
                      datasets: [
                        {
                          data: toPercentages(section.values, sectionTotal),
                          backgroundColor:
                            category === 'all'
                              ? ALL_CATEGORIES.map((cat) => CATEGORY_CHART_COLORS[cat])
                              : generateSlicePalette(section.values.length),
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: true }, tooltip: PIE_TOOLTIP },
                    }}
                  />
                )}
              </div>
            );
          })}
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

          {yearlySections.map((section) => {
            const sectionTotal = section.datasets.reduce(
              (sum, dataset) => sum + dataset.data.reduce((inner, value) => inner + value, 0),
              0,
            );
            // Pie view: with multiple datasets ("Alle" categories) each dataset becomes one slice (its yearly total);
            // otherwise each bucket (month/week/day) of the single dataset becomes one slice.
            const isMultiDataset = section.datasets.length > 1;
            const pieLabels = isMultiDataset ? section.datasets.map((dataset) => dataset.label) : yearlyLabels;
            const pieValues = isMultiDataset
              ? section.datasets.map((dataset) => dataset.data.reduce((sum, value) => sum + value, 0))
              : section.datasets[0]?.data ?? [];
            const pieColors = isMultiDataset
              ? section.datasets.map((dataset) => dataset.backgroundColor as string)
              : generateSlicePalette(pieValues.length);
            return (
              <div key={section.key} className="filters-chart-section">
                {section.title && <h3>{section.title}</h3>}
                <p className="filters-summary">
                  {yearlyCategory === 'game' ? formatMinutes(sectionTotal) : sectionTotal}{' '}
                  {toInlineLabel(section.valueLabel)} in {effectiveYear}
                </p>

                {chartType === 'bar' ? (
                  <Bar
                    data={{
                      labels: yearlyLabels,
                      datasets: section.datasets,
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
                ) : (
                  <Pie
                    data={{
                      labels: pieLabels,
                      datasets: [
                        {
                          data: toPercentages(pieValues, sectionTotal),
                          backgroundColor: pieColors,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      plugins: { legend: { display: true }, tooltip: PIE_TOOLTIP },
                    }}
                  />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

