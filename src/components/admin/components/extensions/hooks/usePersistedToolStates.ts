import { useEffect, useMemo, useState } from 'react';
import {
  createEmptyToolState,
  persistToolStateMap,
  restoreToolStateMap,
  type ToolState,
} from '../uiState';

export const usePersistedToolStates = (userId?: string) => {
  const [toolStates, setToolStates] = useState<Record<string, ToolState>>({});

  useEffect(() => {
    if (!userId) return;
    setToolStates((prev) => restoreToolStateMap(userId, prev));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    persistToolStateMap(userId, toolStates);
  }, [userId, toolStates]);

  const updateToolState = useMemo(() => {
    return (tool: string, patch: Partial<ToolState>) => {
      setToolStates((prev) => ({
        ...prev,
        [tool]: { ...(prev[tool] ?? createEmptyToolState()), ...patch },
      }));
    };
  }, []);

  return {
    toolStates,
    setToolStates,
    updateToolState,
  };
};
