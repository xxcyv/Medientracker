import { useMemo, useState } from 'react';
import { useData } from '../../data/DataContext';
import { CATEGORY_LABELS } from '../../utils/format';
import type { Category } from '../../sheets/types';
import { MediaListItem } from './MediaListItem';

const CATEGORIES: Category[] = ['game', 'series', 'book', 'movie'];

/** Overview of all tracked media, grouped by category, with each medium's headline statistic. */
export function MediaListPage() {
  const { media, loading, error } = useData();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');

  const groupedMedia = useMemo(() => {
    const filtered = activeCategory === 'all' ? media : media.filter((medium) => medium.category === activeCategory);
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [media, activeCategory]);

  if (loading) return <p>Daten werden geladen…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <div className="media-list-page">
      <div className="category-filter">
        <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => setActiveCategory('all')}>
          Alle
        </button>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      <ul className="media-list">
        {groupedMedia.map((medium) => (
          <MediaListItem key={`${medium.category}-${medium.name}`} medium={medium} />
        ))}
      </ul>
    </div>
  );
}
