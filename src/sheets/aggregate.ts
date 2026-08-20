import type { DailyEntry, MediaGroup, Medium, MediumStats } from './types';
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

// Picks the unit used by the majority of a book's entries, defaulting to chapters on a tie.
function determineBookUnit(entries: DailyEntry[]): 'chapters' | 'pages' {
  const chapterCount = entries.filter((entry) => entry.unit === 'chapters').length;
  const pageCount = entries.filter((entry) => entry.unit === 'pages').length;
  return pageCount > chapterCount ? 'pages' : 'chapters';
}

/** Merges member media of each group into one synthetic Medium, so they appear and aggregate as one. */
export function applyMediaGroups(media: Medium[], groups: MediaGroup[]): Medium[] {
  if (groups.length === 0) return media;

  const groupedNames = new Set<string>();
  const result: Medium[] = [];

  for (const group of groups) {
    const members = media
      .filter((medium) => medium.category === group.category && group.memberNames.includes(medium.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (members.length === 0) continue;
    for (const member of members) groupedNames.add(member.name);

    const entries = members.flatMap((member) => member.entries);
    const combined: Medium = {
      name: group.label,
      category: group.category,
      entries,
      groupMembers: members.map((member) => member.name),
      groupMemberDetails: members,
    };
    if (group.category === 'book') {
      combined.bookUnit = determineBookUnit(entries);
    }
    result.push(combined);
  }

  for (const medium of media) {
    if (!groupedNames.has(medium.name)) result.push(medium);
  }

  return result;
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
  // Legacy entries have no exact date but carry their own explicit day count instead.
  const legacyEntries = relevantEntries.filter((entry) => entry.legacy !== undefined);
  const daysConsumed =
    new Set(datedEntries.map((entry) => entry.date)).size +
    legacyEntries.reduce((sum, entry) => sum + (entry.legacy?.days ?? 0), 0);
  const datedSum =
    datedEntries.reduce((sum, entry) => sum + entry.amount, 0) +
    legacyEntries.reduce((sum, entry) => sum + entry.amount, 0);

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
