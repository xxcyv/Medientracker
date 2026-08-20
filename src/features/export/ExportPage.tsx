import { useMemo, useState } from 'react';
import { useData } from '../../data/DataContext';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../utils/format';
import { buildExportFilename, buildExportLines, downloadTextFile, type ExportRange } from '../../utils/export';
import { asyncStateView } from '../../components/AsyncState';
import type { Category } from '../../sheets/types';

type RangeMode = 'all' | 'year' | 'custom';

/** Lets the user export every medium's total statistic for one category and time range as a .txt file. */
export function ExportPage() {
  const { media, loading, error } = useData();
  const [category, setCategory] = useState<Category>('game');
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [year, setYear] = useState<number | null>(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Collects the years that have data for the selected category, newest first.
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const medium of media) {
      if (medium.category !== category) continue;
      for (const entry of medium.entries) {
        if (entry.date) years.add(Number(entry.date.slice(0, 4)));
      }
    }
    return [...years].sort((a, b) => b - a);
  }, [media, category]);

  // Resolves the current mode and its inputs into the concrete range passed to the export helpers.
  const range = useMemo<ExportRange>(() => {
    if (rangeMode === 'year') return year ?? availableYears[0] ?? 'all';
    if (rangeMode === 'custom' && customFrom && customTo) {
      return customFrom <= customTo ? { start: customFrom, end: customTo } : { start: customTo, end: customFrom };
    }
    return 'all';
  }, [rangeMode, year, availableYears, customFrom, customTo]);

  const lines = useMemo(() => buildExportLines(media, category, range), [media, category, range]);

  // Resets the year filter since available years differ per category.
  function handleCategoryChange(next: Category) {
    setCategory(next);
    setYear(null);
  }

  // Triggers a browser download of the current export lines as a .txt file.
  function handleExport() {
    downloadTextFile(buildExportFilename(category, range), lines.join('\n'));
  }

  const asyncState = asyncStateView(loading, error);
  if (asyncState) return asyncState;

  return (
    <div className="export-page">
      <div className="filters-controls">
        <label>
          Kategorie
          <select value={category} onChange={(event) => handleCategoryChange(event.target.value as Category)}>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zeitraum
          <select value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)}>
            <option value="all">Alle Jahre</option>
            <option value="year">Einzelnes Jahr</option>
            <option value="custom">Eigener Zeitraum</option>
          </select>
        </label>
        {rangeMode === 'year' && (
          <label>
            Jahr
            <select value={year ?? availableYears[0] ?? ''} onChange={(event) => setYear(Number(event.target.value))}>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}
        {rangeMode === 'custom' && (
          <label>
            Von
            <input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          </label>
        )}
        {rangeMode === 'custom' && (
          <label>
            Bis
            <input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
          </label>
        )}
      </div>

      <p className="filters-summary">{lines.length} Medien im gewählten Zeitraum</p>

      <button type="button" onClick={handleExport} disabled={lines.length === 0}>
        Als .txt exportieren
      </button>
    </div>
  );
}

