import type { MediaGroup } from '../sheets/types';

const STORAGE_KEY = 'medienkonsum:media-groups';

/** Reads user-defined media groups from local storage; returns an empty list on first use or on error. */
export function loadMediaGroups(): MediaGroup[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Persists the given groups to local storage as JSON.
export function saveMediaGroups(groups: MediaGroup[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
}

// Generates a reasonably unique id for a newly created group.
export function createGroupId(): string {
  return `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
