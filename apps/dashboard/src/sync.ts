import type { SessionResponse } from '@contracking/shared';
import { fetchMySession, syncSession } from './api';
import type { LocalSession } from './storage';

export async function pushToCloud(localSession: LocalSession): Promise<SessionResponse> {
  const hasLocalData = localSession.contractions.length > 0 || localSession.events.length > 0;
  const deletedIds = hasLocalData ? localSession.tombstones.map((tombstone) => tombstone.id) : [];

  return syncSession({
    patientName: localSession.patientName,
    gestationalWeek: localSession.gestationalWeek,
    timezone: localSession.timezone,
    startedAt: localSession.startedAt,
    contractions: localSession.contractions
      .filter((contraction) => contraction.syncedAt === null)
      .map((contraction) => ({
        id: contraction.id,
        startedAt: contraction.startedAt,
        endedAt: contraction.endedAt,
        intensity: contraction.intensity,
        position: contraction.position,
        notes: contraction.notes,
      })),
    events: localSession.events
      .filter((event) => event.syncedAt === null)
      .map((event) => ({
        id: event.id,
        type: event.type,
        value: event.value,
        occurredAt: event.occurredAt,
      })),
    deletedIds,
  });
}

export async function pullFromCloud(): Promise<SessionResponse | null> {
  try {
    return await fetchMySession();
  } catch {
    return null;
  }
}

export function mergeWithCloud(localSession: LocalSession, cloudResponse: SessionResponse): LocalSession {
  const tombstoneIds = new Set(localSession.tombstones.map((tombstone) => tombstone.id));
  const now = new Date().toISOString();

  const localContractionMap = new Map(localSession.contractions.map((contraction) => [contraction.id, contraction]));
  const localEventMap = new Map(localSession.events.map((event) => [event.id, event]));
  const processedContractionIds = new Set<string>();
  const processedEventIds = new Set<string>();

  const mergedContractions = cloudResponse.contractions
    .filter((contraction) => !tombstoneIds.has(contraction.id))
    .map((cloudContraction) => {
      processedContractionIds.add(cloudContraction.id);
      const localContraction = localContractionMap.get(cloudContraction.id);

      if (localContraction && localContraction.syncedAt === null) return localContraction;

      return {
        id: cloudContraction.id,
        startedAt: new Date(cloudContraction.startedAt).toISOString(),
        endedAt: cloudContraction.endedAt ? new Date(cloudContraction.endedAt).toISOString() : null,
        intensity: cloudContraction.intensity,
        position: cloudContraction.position,
        notes: cloudContraction.notes,
        syncedAt: now,
        updatedAt: now,
      };
    });

  const localOnlyContractions = localSession.contractions.filter(
    (contraction) => !processedContractionIds.has(contraction.id) && !tombstoneIds.has(contraction.id),
  );

  const mergedEvents = cloudResponse.events
    .filter((event) => !tombstoneIds.has(event.id))
    .map((cloudEvent) => {
      processedEventIds.add(cloudEvent.id);
      const localEvent = localEventMap.get(cloudEvent.id);

      if (localEvent && localEvent.syncedAt === null) return localEvent;

      return {
        id: cloudEvent.id,
        type: cloudEvent.type,
        value: cloudEvent.value,
        occurredAt: new Date(cloudEvent.occurredAt).toISOString(),
        syncedAt: now,
        updatedAt: now,
      };
    });

  const localOnlyEvents = localSession.events.filter(
    (event) => !processedEventIds.has(event.id) && !tombstoneIds.has(event.id),
  );

  return {
    ...localSession,
    publicId: cloudResponse.session.publicId,
    contractions: [...mergedContractions, ...localOnlyContractions],
    events: [...mergedEvents, ...localOnlyEvents],
    tombstones: localSession.tombstones,
  };
}
