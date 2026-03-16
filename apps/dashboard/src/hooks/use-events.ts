import type { EventType } from '@contracking/shared';
import { useCallback } from 'react';
import { createEvent as apiCreateEvent, deleteEvent as apiDeleteEvent } from '../api';

type UseEventsParams = {
  refresh: () => Promise<void>;
};

export function useEvents({ refresh }: UseEventsParams) {
  const handleCreateEvent = useCallback(
    async (sessionId: string, type: EventType, value?: string) => {
      await apiCreateEvent(sessionId, { type, value });
      await refresh();
    },
    [refresh],
  );

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      await apiDeleteEvent(id);
      await refresh();
    },
    [refresh],
  );

  return { handleCreateEvent, handleDeleteEvent };
}
