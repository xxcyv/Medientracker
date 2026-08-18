import type { DailyEntry, Medium, MediumStats } from './types';
import type { RawExtraction } from './parseSheet';

/** Groups raw per-line extractions from all sheets into one Medium per unique name. */
export function buildMedia(extractions: RawExtraction[]): Medium[] {
  const byName = new Map<string, Medium>();

  for (const { name, category, entry } of extractions) {
    let medium = byName.get(name);
    if (!medium) {
      medium = { name, category, entries: [] };
      byName.set(name, medium);
    } else if (medium.category !== category) {
      // A medium name must belong to exactly one category; surface conflicting data instead of
      // silently mixing it, so it can be spotted and fixed in the spreadsheet.
      console.warn(`"${name}" appears under both "${medium.category}" and "${category}"; keeping the first.`);
      continue;
    }
    medium.entries.push(entry);
  }

  for (const medium of byName.values()) {
    if (medium.category === 'book') {
      medium.bookUnit = determineBookUnit(medium.entries);
    }
  }

  return [...byName.values()];
}

function determineBookUnit(entries: DailyEntry[]): 'chapters' | 'pages' {
  const chapterCount = entries.filter((entry) => entry.unit === 'chapters').length;
  const pageCount = entries.filter((entry) => entry.unit === 'pages').length;
  return pageCount > chapterCount ? 'pages' : 'chapters';
}

/** Computes the headline and expandable secondary statistics for a medium. */
export function computeStats(medium: Medium): MediumStats {
  if (medium.category === 'movie') {
    return { mainValue: medium.entries.length };
  }

  if (medium.category === 'series' && medium.name === 'Critical Role') {
    return computeCriticalRoleStats(medium.entries);
  }

  const relevantEntries =
    medium.category === 'book' ? medium.entries.filter((entry) => entry.unit === medium.bookUnit) : medium.entries;

  const mainValue = relevantEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const datedEntries = relevantEntries.filter((entry) => entry.date !== null);
  const daysConsumed = new Set(datedEntries.map((entry) => entry.date)).size;
  const datedSum = datedEntries.reduce((sum, entry) => sum + entry.amount, 0);

  return {
    mainValue,
    daysConsumed,
    averagePerDay: daysConsumed > 0 ? datedSum / daysConsumed : 0,
  };
}

function computeCriticalRoleStats(entries: DailyEntry[]): MediumStats {
  // Because one Critical Role episode is spread over multiple days, the episode count comes
  // from the number of distinct episode numbers seen, not from summing entry amounts.
  const knownEpisodeNumbers = new Set(
    entries.filter((entry) => entry.episodeNumber !== undefined).map((entry) => entry.episodeNumber),
  );
  const datedEntries = entries.filter((entry) => entry.date !== null);
  const daysConsumed = new Set(datedEntries.map((entry) => entry.date)).size;

  return {
    mainValue: knownEpisodeNumbers.size,
    daysConsumed,
    averagePerDay: daysConsumed > 0 ? knownEpisodeNumbers.size / daysConsumed : 0,
  };
}
