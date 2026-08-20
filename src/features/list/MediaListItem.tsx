import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { computeStats } from '../../sheets/aggregate';
import type { Medium, MediumStats } from '../../sheets/types';
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

/** Renders the "Tage" / "Durchschnitt pro Tag" / "Jahre" definition list shared by totals and per-member stats. */
function StatsDetailList({ medium, stats, years }: { medium: Medium; stats: MediumStats; years: number[] }): ReactNode {
  if (medium.category === 'movie' && years.length === 0) return null;
  return (
    <dl>
      {medium.category !== 'movie' && (
        <>
          <dt>Tage</dt>
          <dd>{stats.daysConsumed}</dd>
          <dt>Durchschnitt pro Tag</dt>
          <dd>{formatAverage(medium, stats.averagePerDay ?? 0)}</dd>
        </>
      )}
      {years.length > 0 && (
        <>
          <dt>Jahre</dt>
          <dd>{years.join(', ')}</dd>
        </>
      )}
    </dl>
  );
}

/** One row in the media list: headline stat always visible, secondary stats and note collapsible. */
export function MediaListItem({ medium, selectable, selected, onToggleSelect, onUngroup }: MediaListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = useMemo(() => computeStats(medium), [medium]);
  const consumedYears = useMemo(() => getConsumedYears(medium), [medium]);

  // Skip the toggle when the click ends a text selection, so titles stay selectable with the mouse.
  const handleToggleClick = () => {
    if ((window.getSelection()?.toString().length ?? 0) > 0) return;
    setExpanded((value) => !value);
  };

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
        <div
          className="media-list-item-toggle"
          role="button"
          tabIndex={0}
          onClick={handleToggleClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setExpanded((value) => !value);
            }
          }}
        >
          <span className="media-name">{medium.name}</span>
          <span className="media-main-stat">{formatMainStat(medium, stats)}</span>
        </div>
      </div>

      {expanded && (
        <div className="media-list-item-details">
          <StatsDetailList medium={medium} stats={stats} years={consumedYears} />
          {medium.groupMemberDetails && (
            <div className="media-group-member-stats">
              <p className="media-group-member-stats-title">Einzelstatistiken:</p>
              <ul>
                {medium.groupMemberDetails.map((member) => (
                  <li key={member.name}>
                    <GroupMemberStats medium={member} />
                  </li>
                ))}
              </ul>
            </div>
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
        </div>
      )}
    </li>
  );
}

/** The headline stat and secondary details for one member of a group, shown when the group is expanded. */
function GroupMemberStats({ medium }: { medium: Medium }) {
  const stats = useMemo(() => computeStats(medium), [medium]);
  const years = useMemo(() => getConsumedYears(medium), [medium]);

  return (
    <>
      <div className="media-group-member-header">
        <span className="media-name">{medium.name}</span>
        <span className="media-main-stat">{formatMainStat(medium, stats)}</span>
      </div>
      <StatsDetailList medium={medium} stats={stats} years={years} />
    </>
  );
}

