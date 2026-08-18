import { useState } from 'react';
import { computeStats } from '../../sheets/aggregate';
import type { Medium } from '../../sheets/types';
import { formatAverage, formatMainStat } from '../../utils/format';

interface MediaListItemProps {
  medium: Medium;
}

/** One row in the media list: headline stat always visible, secondary stats and note collapsible. */
export function MediaListItem({ medium }: MediaListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const stats = computeStats(medium);

  return (
    <li className="media-list-item">
      <button type="button" className="media-list-item-header" onClick={() => setExpanded((value) => !value)}>
        <span className="media-name">{medium.name}</span>
        <span className="media-main-stat">{formatMainStat(medium, stats)}</span>
      </button>

      {expanded && (
        <div className="media-list-item-details">
          {medium.category !== 'movie' && (
            <dl>
              <dt>Konsumierte Tage</dt>
              <dd>{stats.daysConsumed}</dd>
              <dt>Durchschnitt pro Tag</dt>
              <dd>{formatAverage(medium, stats.averagePerDay ?? 0)}</dd>
            </dl>
          )}
        </div>
      )}
    </li>
  );
}
