import { useEffect, useRef } from 'react';

export type AutoSaveTask = () => void | Promise<void>;

interface UseAutoSaveOptions {
  enabled: boolean;
  intervalMs: number;
  task: AutoSaveTask;
  skipWhenHidden?: boolean;
}

export function useAutoSave({ enabled, intervalMs, task, skipWhenHidden = true }: UseAutoSaveOptions): void {
  const taskRef = useRef<AutoSaveTask>(task);
  const inFlightRef = useRef(false);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled) return undefined;
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return undefined;

    const id = window.setInterval(() => {
      if (skipWhenHidden && typeof document !== 'undefined' && document.hidden) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      Promise.resolve(taskRef.current())
        .catch(() => {})
        .finally(() => {
          inFlightRef.current = false;
        });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [enabled, intervalMs, skipWhenHidden]);
}
