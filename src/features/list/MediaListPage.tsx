import { useMemo, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useCategoryFilter } from '../../state/CategoryFilterContext';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../utils/format';
import { asyncStateView } from '../../components/AsyncState';
import { MediaListItem } from './MediaListItem';

/** Overview of all tracked media, grouped by category, with each medium's headline statistic. */
export function MediaListPage() {
  const { media, loading, error, groups, createGroup, deleteGroup } = useData();
  const { listCategory: activeCategory, setListCategory: setActiveCategory } = useCategoryFilter();
  const [groupingMode, setGroupingMode] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [groupLabel, setGroupLabel] = useState('');

  // Filters media by the active category and sorts alphabetically for display.
  const groupedMedia = useMemo(() => {
    const filtered = activeCategory === 'all' ? media : media.filter((medium) => medium.category === activeCategory);
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [media, activeCategory]);

  // Enters/exits grouping mode and resets any in-progress selection.
  function toggleGroupingMode() {
    setGroupingMode((value) => !value);
    setSelectedNames(new Set());
    setGroupLabel('');
  }

  // Adds or removes a medium name from the current selection set.
  function toggleSelected(name: string) {
    setSelectedNames((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Creates a group from the selected media once the minimum requirements are met.
  function handleCreateGroup() {
    if (activeCategory === 'all' || selectedNames.size < 2 || !groupLabel.trim()) return;
    createGroup(activeCategory, [...selectedNames], groupLabel.trim());
    setSelectedNames(new Set());
    setGroupLabel('');
    setGroupingMode(false);
  }

  // Finds and deletes the underlying group that produced this synthetic grouped medium.
  function handleUngroup(medium: (typeof groupedMedia)[number]) {
    const group = groups.find((candidate) => candidate.category === medium.category && candidate.label === medium.name);
    if (group) deleteGroup(group.id);
  }

  const asyncState = asyncStateView(loading, error);
  if (asyncState) return asyncState;

  return (
    <div className="media-list-page">
      <div className="category-filter">
        <button type="button" className={activeCategory === 'all' ? 'active' : ''} onClick={() => setActiveCategory('all')}>
          Alle
        </button>
        {ALL_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {CATEGORY_LABELS[category]}
          </button>
        ))}
        <button
          type="button"
          className={groupingMode ? 'active' : ''}
          disabled={activeCategory === 'all'}
          title={activeCategory === 'all' ? 'Zum Gruppieren zuerst eine Kategorie auswählen' : undefined}
          onClick={toggleGroupingMode}
        >
          Gruppieren
        </button>
      </div>

      {groupingMode && (
        <div className="grouping-bar">
          <span>{selectedNames.size} ausgewählt</span>
          <input
            type="text"
            placeholder="Name der Gruppe"
            value={groupLabel}
            onChange={(event) => setGroupLabel(event.target.value)}
          />
          <button type="button" onClick={handleCreateGroup} disabled={selectedNames.size < 2 || !groupLabel.trim()}>
            Gruppe erstellen
          </button>
        </div>
      )}

      <ul className="media-list">
        {groupedMedia.map((medium) => (
          <MediaListItem
            key={`${medium.category}-${medium.name}`}
            medium={medium}
            selectable={groupingMode && !medium.groupMembers}
            selected={selectedNames.has(medium.name)}
            onToggleSelect={() => toggleSelected(medium.name)}
            onUngroup={medium.groupMembers ? () => handleUngroup(medium) : undefined}
          />
        ))}
      </ul>
    </div>
  );
}
