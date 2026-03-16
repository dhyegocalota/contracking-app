import type { Contraction } from '@contracking/shared';
import { useCallback, useMemo } from 'react';
import {
  createContraction as apiCreateContraction,
  deleteContraction as apiDeleteContraction,
  updateContraction as apiUpdateContraction,
} from '../api';

type UseContractionsParams = {
  contractions: Contraction[];
  refresh: () => Promise<void>;
  setContractions: (updater: (previous: Contraction[]) => Contraction[]) => void;
};

type UpdateContractionData = {
  endedAt?: string;
  intensity?: string;
  position?: string;
  notes?: string;
};

export function useContractions({ contractions, refresh, setContractions }: UseContractionsParams) {
  const activeContraction = useMemo(() => contractions.find((c) => c.endedAt === null) ?? null, [contractions]);

  const startContraction = useCallback(
    async (sessionId: string) => {
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticContraction: Contraction = {
        id: optimisticId,
        sessionId,
        startedAt: new Date(),
        endedAt: null,
        intensity: null,
        position: null,
        notes: null,
      };
      setContractions((previous) => [...previous, optimisticContraction]);
      const created = await apiCreateContraction(sessionId);
      setContractions((previous) =>
        previous.map((contraction) => (contraction.id === optimisticId ? created : contraction)),
      );
      await refresh();
    },
    [refresh, setContractions],
  );

  const stopContraction = useCallback(
    async (id: string) => {
      const endedAt = new Date().toISOString();
      setContractions((previous) =>
        previous.map((contraction) =>
          contraction.id === id ? { ...contraction, endedAt: new Date(endedAt) } : contraction,
        ),
      );
      await apiUpdateContraction(id, { endedAt });
      await refresh();
    },
    [refresh, setContractions],
  );

  const updateContraction = useCallback(
    async (id: string, data: UpdateContractionData) => {
      await apiUpdateContraction(id, data);
      await refresh();
    },
    [refresh],
  );

  const deleteContraction = useCallback(
    async (id: string) => {
      await apiDeleteContraction(id);
      await refresh();
    },
    [refresh],
  );

  return { activeContraction, startContraction, stopContraction, updateContraction, deleteContraction };
}
