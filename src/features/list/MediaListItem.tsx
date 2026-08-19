import { useMemo, useState, type CSSProperties } from 'react';
import { computeStats } from '../../sheets/aggregate';
import type { Medium } from '../../sheets/types';
import { formatAverage, formatMainStat, getConsumedYears } from '../../utils/format';
import { CATEGORY_COLORS } from '../../utils/categoryColors';

interface MediaListItemProps {
  medium: Medium;
  /** Whether a selection checkbox for grouping should be shown for this item. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Present only for group items; dissolves the group back into its individual media. */
  onUngroup?: () => void;
}

/** One row in the media list: headline stat always visible, secondary stats and note collapsible. */
export function MediaListItem({ medium, selectable, selected, onToggleSelect, onUngroup }: MediaListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = useMemo(() => computeStats(medium), [medium]);
  const consumedYears = useMemo(() => getConsumedYears(medium), [medium]);

  return (
    <li className="media-list-item" style={{ '--cat-color': CATEGORY_COLORS[medium.category].base } as CSSProperties}>
      <div className="media-list-item-header">
        {selectable && (
          <input
            type="checkbox"
            className="media-select-checkbox"
            checked={selected ?? false}
            onChange={onToggleSelect}
            aria-label={`${medium.name} für Gruppe auswählen`}
          />
        )}
        <button type="button" className="media-list-item-toggle" onClick={() => setExpanded((value) => !value)}>
          <span className="media-name">{medium.name}</span>
          <span className="media-main-stat">{formatMainStat(medium, stats)}</span>
        </button>
      </div>

      {expanded && (
        <div className="media-list-item-details">
          {medium.category !== 'movie' && (
            <dl>
              <dt>Tage</dt>
              <dd>{stats.daysConsumed}</dd>
              <dt>Durchschnitt pro Tag</dt>
              <dd>{formatAverage(medium, stats.averagePerDay ?? 0)}</dd>
            </dl>
          )}
          {medium.groupMembers && (
            <div className="media-group-info">
              <p>Gruppiert aus: {medium.groupMembers.join(', ')}</p>
              {onUngroup && (
                <button type="button" onClick={onUngroup}>
                  Gruppierung aufheben
                </button>
              )}
            </div>
          )}
          {consumedYears.length > 0 && <p className="media-consumed-years">Jahre: {consumedYears.join(', ')}</p>}
        </div>
      )}
    </li>
  );
}
