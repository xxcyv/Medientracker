import { useMemo, useState } from 'react';
import { useData } from '../../data/DataContext';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../utils/format';
import { buildExportFilename, buildExportLines, downloadTextFile } from '../../utils/export';
import { asyncStateView } from '../../components/AsyncState';
import type { Category } from '../../sheets/types';

/** Lets the user export every medium's total statistic for one category and time range as a .txt file. */
export function ExportPage() {
  const { media, loading, error } = useData();
  const [category, setCategory] = useState<Category>('game');
  const [year, setYear] = useState<number | 'all'>('all');

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

  const lines = useMemo(() => buildExportLines(media, category, year), [media, category, year]);

  // Resets the year filter since available years differ per category.
  function handleCategoryChange(next: Category) {
    setCategory(next);
    setYear('all');
  }

  // Triggers a browser download of the current export lines as a .txt file.
  function handleExport() {
    downloadTextFile(buildExportFilename(category, year), lines.join('\n'));
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
          <select
            value={year}
            onChange={(event) => setYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}
          >
            <option value="all">Alle Jahre</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="filters-summary">{lines.length} Medien im gewählten Zeitraum</p>

      <button type="button" onClick={handleExport} disabled={lines.length === 0}>
        Als .txt exportieren
      </button>
    </div>
  );
}
