import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../data/DataContext';
import { useCategoryFilter } from '../../state/CategoryFilterContext';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../../utils/format';
import { asyncStateView } from '../../components/AsyncState';
import { MediaListItem } from './MediaListItem';

/** Overview of all tracked media, grouped by category, with each medium's headline statistic. */
export function MediaListPage() {
  const { media, loading, error, groups, createGroup, addToGroup, deleteGroup } = useData();
  const { listCategory: activeCategory, setListCategory: setActiveCategory } = useCategoryFilter();
  const [groupingMode, setGroupingMode] = useState(false);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [groupLabel, setGroupLabel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focuses the search field as soon as it appears, so typing works right after clicking the icon.
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);


  // Existing groups for the active category, offered as "add to group" targets while grouping.
  const existingGroups = useMemo(
    () => groups.filter((group) => group.category === activeCategory),
    [groups, activeCategory],
  );

  // Exits grouping mode when the category filter is cleared, since grouping requires a category.
  useEffect(() => {
    if (activeCategory === 'all' && groupingMode) toggleGroupingMode();
  }, [activeCategory]);

  // Filters media by the active category and search term (case-insensitive substring match), then sorts alphabetically.
  const groupedMedia = useMemo(() => {
    const byCategory = activeCategory === 'all' ? media : media.filter((medium) => medium.category === activeCategory);
    const term = searchTerm.trim().toLowerCase();
    const filtered = term ? byCategory.filter((medium) => medium.name.toLowerCase().includes(term)) : byCategory;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [media, activeCategory, searchTerm]);

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
  }

  // Adds all selected media to an already existing group.
  function handleAddToGroup(groupId: string) {
    if (selectedNames.size === 0) return;
    addToGroup(groupId, [...selectedNames]);
    setSelectedNames(new Set());
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
      <div className="list-toolbar">
        <div className="list-toolbar-row">
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
          </div>

          {activeCategory !== 'all' && (
            <button
              type="button"
              className={`grouping-toggle${groupingMode ? ' active' : ''}`}
              onClick={toggleGroupingMode}
            >
              Gruppieren
            </button>
          )}

          {searchOpen ? (
            <input
              type="search"
              ref={searchInputRef}
              className="list-search-input"
              placeholder="Suchen…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onBlur={() => {
                if (!searchTerm.trim()) setSearchOpen(false);
              }}
            />
          ) : (
            <button
              type="button"
              className="list-search-toggle"
              aria-label="Suchen"
              onClick={() => setSearchOpen(true)}
            >
              🔍
            </button>
          )}
        </div>

        {groupingMode && (
          <div className="grouping-bar">
            <span>{selectedNames.size} ausgewählt</span>
            <input
              type="text"
              placeholder="Name der neuen Gruppe"
              value={groupLabel}
              onChange={(event) => setGroupLabel(event.target.value)}
            />
            <button type="button" onClick={handleCreateGroup} disabled={selectedNames.size < 2 || !groupLabel.trim()}>
              Gruppe erstellen
            </button>
            {existingGroups.length > 0 && (
              <div className="grouping-bar-existing">
                <span>Zu Gruppe hinzufügen:</span>
                {existingGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => handleAddToGroup(group.id)}
                    disabled={selectedNames.size === 0}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
