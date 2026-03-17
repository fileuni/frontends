/// <reference path="../types/vite-worker.d.ts" />

import { useEffect, useState } from "react";

interface MonacoWindow extends Window {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, _label: string) => Worker;
  };
}

type MonacoModule = typeof import("monaco-editor");

let monacoReadyPromise: Promise<MonacoModule> | null = null;

const isMobileUserAgent = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
};

const isTauriRuntime = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
};

const isTauriMobileRuntime = (): boolean => isTauriRuntime() && isMobileUserAgent();

export const isMonacoSupported = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  // Product decision: only disable Monaco on Tauri Android/iOS.
  // Keep Monaco available in PC browsers.
  if (isTauriMobileRuntime()) {
    return false;
  }
  return typeof window.Worker !== "undefined";
};

export const ensureMonacoReady = (): Promise<MonacoModule> => {
  if (!isMonacoSupported()) {
    return Promise.reject(new Error("Monaco is disabled in the current runtime"));
  }
  if (monacoReadyPromise) {
    return monacoReadyPromise;
  }
  monacoReadyPromise = (async () => {
    const [{ loader }, { default: EditorWorker }] = await Promise.all([
      import("@monaco-editor/react"),
      import("monaco-editor/esm/vs/editor/editor.worker?worker"),
    ]);
    const monacoInstance: MonacoModule = await import("monaco-editor");
    const monacoWindow = window as MonacoWindow;
    if (!monacoWindow.MonacoEnvironment) {
      monacoWindow.MonacoEnvironment = {
        getWorker: function (_moduleId: string, _label: string) {
          return new EditorWorker();
        },
      };
    }
    loader.config({ monaco: monacoInstance });
    await loader.init();
    return monacoInstance;
  })();
  return monacoReadyPromise;
};

export const useMonacoReady = (options?: { enabled?: boolean }) => {
  const [status, setStatus] = useState<"pending" | "ready" | "failed">("pending");

  useEffect(() => {
    if (options?.enabled === false) {
      setStatus("pending");
      return undefined;
    }
    if (!isMonacoSupported()) {
      setStatus("failed");
      return undefined;
    }
    let cancelled = false;
    ensureMonacoReady()
      .then(() => {
        if (!cancelled) {
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus("failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [options?.enabled]);

  return status;
};
