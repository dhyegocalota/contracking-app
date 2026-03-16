import type { LocalSession } from '../storage';

type MergeResult = {
  merged: LocalSession;
  contractionCount: number;
  eventCount: number;
};

export function mergeImportedSession({
  existing,
  imported,
}: {
  existing: LocalSession;
  imported: LocalSession;
}): MergeResult {
  const tombstoneIds = new Set((existing.tombstones ?? []).map((tombstone) => tombstone.id));

  const contractionMap = new Map(existing.contractions.map((contraction) => [contraction.id, contraction]));
  let newContractionCount = 0;

  for (const contraction of imported.contractions) {
    if (tombstoneIds.has(contraction.id)) continue;

    const asUnsynced = { ...contraction, syncedAt: null };
    const existingContraction = contractionMap.get(contraction.id);
    if (!existingContraction) {
      contractionMap.set(contraction.id, asUnsynced);
      newContractionCount++;
      continue;
    }
    const importedHasEnd = contraction.endedAt !== null;
    const existingHasEnd = existingContraction.endedAt !== null;
    if (importedHasEnd && !existingHasEnd) {
      contractionMap.set(contraction.id, asUnsynced);
      continue;
    }
    if (importedHasEnd && existingHasEnd && contraction.endedAt! > existingContraction.endedAt!) {
      contractionMap.set(contraction.id, asUnsynced);
    }
  }

  const eventMap = new Map(existing.events.map((event) => [event.id, event]));
  let newEventCount = 0;

  for (const event of imported.events) {
    if (tombstoneIds.has(event.id)) continue;
    if (eventMap.has(event.id)) continue;
    eventMap.set(event.id, { ...event, syncedAt: null });
    newEventCount++;
  }

  const mergedTombstones = [
    ...(existing.tombstones ?? []),
    ...(imported.tombstones ?? []).filter((tombstone) => !tombstoneIds.has(tombstone.id)),
  ];

  return {
    merged: {
      ...existing,
      contractions: Array.from(contractionMap.values()),
      events: Array.from(eventMap.values()),
      tombstones: mergedTombstones,
    },
    contractionCount: newContractionCount,
    eventCount: newEventCount,
  };
}

export function isValidLocalSession(data: unknown): data is LocalSession {
  if (!data || typeof data !== 'object') return false;
  const session = data as Record<string, unknown>;
  return typeof session.id === 'string' && Array.isArray(session.contractions) && Array.isArray(session.events);
}
