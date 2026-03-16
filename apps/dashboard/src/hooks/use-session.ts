import type { Contraction, Event, SessionStats, TrackingSession } from '@contracking/shared';
import { useCallback, useEffect, useState } from 'react';
import { fetchSession, fetchSessions } from '../api';

type SessionState = {
  session: TrackingSession | null;
  contractions: Contraction[];
  events: Event[];
  stats: SessionStats | null;
  loading: boolean;
};

const INITIAL_STATE: SessionState = {
  session: null,
  contractions: [],
  events: [],
  stats: null,
  loading: true,
};

export function useSession() {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);

  const loadSession = useCallback(async (id: string) => {
    const data = await fetchSession(id);
    setState((prev) => ({
      ...prev,
      session: data.session,
      contractions: data.contractions,
      events: data.events,
      stats: data.stats,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!state.session) return;
    await loadSession(state.session.id);
  }, [state.session, loadSession]);

  const setContractions = useCallback((updater: (previous: Contraction[]) => Contraction[]) => {
    setState((prev) => ({ ...prev, contractions: updater(prev.contractions) }));
  }, []);

  useEffect(() => {
    fetchSessions()
      .then((sessions) => {
        const mostRecent = sessions[0] ?? null;
        if (!mostRecent) return setState((prev) => ({ ...prev, loading: false }));
        return fetchSession(mostRecent.id).then((data) => {
          setState({
            session: data.session,
            contractions: data.contractions,
            events: data.events,
            stats: data.stats,
            loading: false,
          });
        });
      })
      .catch(() => setState((prev) => ({ ...prev, loading: false })));
  }, []);

  return { ...state, loadSession, refresh, setContractions };
}
