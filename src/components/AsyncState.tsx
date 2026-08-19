/** Shared "loading"/"error" placeholder shown by data-driven pages before their real content; returns null once data is ready. */
export function asyncStateView(loading: boolean, error: string | null) {
  if (loading) return <p>Daten werden geladen…</p>;
  if (error) return <p role="alert">{error}</p>;
  return null;
}
