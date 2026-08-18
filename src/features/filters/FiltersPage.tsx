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
import { endOfDay, endOfMonth, endOfYear, isWithinInterval, parseISO, startOfDay, startOfMonth, subMonths } from 'date-fns';
import { useData } from '../../data/DataContext';
import { CATEGORY_LABELS, formatMinutes } from '../../utils/format';
import type { Category } from '../../sheets/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Preset = 'thisMonth' | 'last3Months' | 'thisYear' | 'allTime';

function presetRange(preset: Preset): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last3Months':
      return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now) };
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfYear(now) };
    case 'allTime':
      return { from: new Date(2000, 0, 1), to: endOfYear(now) };
  }
}

const CATEGORIES: Category[] = ['game', 'series', 'book', 'movie'];

/** Lets the user filter tracked entries by category and time range and view the results as a chart. */
export function FiltersPage() {
  const { media, loading, error } = useData();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [preset, setPreset] = useState<Preset>('thisMonth');

  const range = useMemo(() => presetRange(preset), [preset]);

  const chartData = useMemo(() => {
    const filteredMedia = category === 'all' ? media : media.filter((medium) => medium.category === category);

    if (category === 'all') {
      // Amounts are not comparable across categories (minutes vs. episodes vs. chapters), so the
      // overview chart instead shows how many distinct days each category was consumed on.
      const daysPerCategory = new Map<Category, Set<string>>();
      for (const cat of CATEGORIES) daysPerCategory.set(cat, new Set());
      for (const medium of filteredMedia) {
        for (const entry of medium.entries) {
          if (!entry.date || !isWithinInterval(parseISO(entry.date), { start: startOfDay(range.from), end: endOfDay(range.to) })) {
            continue;
          }
          daysPerCategory.get(medium.category)?.add(entry.date);
        }
      }
      return {
        labels: CATEGORIES.map((cat) => CATEGORY_LABELS[cat]),
        values: CATEGORIES.map((cat) => daysPerCategory.get(cat)?.size ?? 0),
        valueLabel: 'Konsumierte Tage',
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
      valueLabel: category === 'game' ? 'Spielzeit (Minuten)' : 'Summe',
    };
  }, [media, category, range]);

  const totalSum = chartData.values.reduce((sum, value) => sum + value, 0);

  if (loading) return <p>Daten werden geladen…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div className="filters-page">
      <div className="filters-controls">
        <label>
          Kategorie
          <select value={category} onChange={(event) => setCategory(event.target.value as Category | 'all')}>
            <option value="all">Alle</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zeitraum
          <select value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
            <option value="thisMonth">Dieser Monat</option>
            <option value="last3Months">Letzte 3 Monate</option>
            <option value="thisYear">Dieses Jahr</option>
            <option value="allTime">Gesamter Zeitraum</option>
          </select>
        </label>
      </div>

      <p className="filters-summary">
        {category === 'game' ? formatMinutes(totalSum) : totalSum} {chartData.valueLabel.toLowerCase()} insgesamt
      </p>

      <Bar
        data={{
          labels: chartData.labels,
          datasets: [{ label: chartData.valueLabel, data: chartData.values, backgroundColor: '#4f6df5' }],
        }}
        options={{ responsive: true, plugins: { legend: { display: false } } }}
      />
    </div>
  );
}
