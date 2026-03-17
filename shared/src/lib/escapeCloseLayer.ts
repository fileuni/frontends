import { useEffect, useRef } from 'react';

type EscapeLayer = {
  id: string;
  enabled: boolean;
  onEscape: () => void;
};

type EscapeLayerStore = {
  layers: EscapeLayer[];
  listenerUsers: number;
  keydownListenerInstalled: boolean;
  idSeq: number;
};

const ESC_LAYER_STORE_KEY = '__fileuni_escape_layer_store__';

const store: EscapeLayerStore = (() => {
  const g = globalThis as unknown as Record<string, unknown>;
  const existing = g[ESC_LAYER_STORE_KEY];
  if (existing && typeof existing === 'object') {
    return existing as EscapeLayerStore;
  }
  const next: EscapeLayerStore = {
    layers: [],
    listenerUsers: 0,
    keydownListenerInstalled: false,
    idSeq: 0,
  };
  g[ESC_LAYER_STORE_KEY] = next;
  return next;
})();

const nextId = () => {
  store.idSeq += 1;
  return `esc-layer-${store.idSeq}`;
};

const removeLayer = (id: string) => {
  const idx = store.layers.findIndex((layer) => layer.id === id);
  if (idx >= 0) {
    store.layers.splice(idx, 1);
  }
};

const upsertLayer = (layer: EscapeLayer) => {
  const idx = store.layers.findIndex((it) => it.id === layer.id);
  if (idx >= 0) {
    store.layers[idx] = layer;
    return;
  }
  store.layers.push(layer);
};

export const isAnyEscLayerOpen = (): boolean => store.layers.length > 0;

export interface UseEscapeToCloseTopLayerOptions {
  active: boolean;
  enabled?: boolean;
  onEscape: () => void;
}

// Registers an "Escape closable" layer. When Escape is pressed, only the top-most
// active layer gets the event. If the top layer is disabled, Escape is swallowed.
export const useEscapeToCloseTopLayer = (options: UseEscapeToCloseTopLayerOptions) => {
  useEscLayerListener();
  const { active, enabled = true, onEscape } = options;
  const layerIdRef = useRef<string>(nextId());

  useEffect(() => {
    if (!active) {
      removeLayer(layerIdRef.current);
      return undefined;
    }

    upsertLayer({ id: layerIdRef.current, enabled, onEscape });

    return () => {
      removeLayer(layerIdRef.current);
    };
  }, [active, enabled, onEscape]);
};

const handleKeyDownCapture = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (store.layers.length === 0) {
    return;
  }

  const top = store.layers[store.layers.length - 1];
  if (!top) {
    return;
  }

  // Swallow Escape if any top-layer is open; only the top one can handle it.
  event.preventDefault();
  event.stopImmediatePropagation();

  if (top.enabled) {
    top.onEscape();
  }
};

const ensureKeydownListener = () => {
  if (store.keydownListenerInstalled) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  window.addEventListener('keydown', handleKeyDownCapture, { capture: true });
  store.keydownListenerInstalled = true;
};

const maybeRemoveKeydownListener = () => {
  if (!store.keydownListenerInstalled) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }
  if (store.listenerUsers > 0) {
    return;
  }
  window.removeEventListener('keydown', handleKeyDownCapture, { capture: true } as AddEventListenerOptions);
  store.keydownListenerInstalled = false;
};

export function useEscLayerListener() {
  useEffect(() => {
    store.listenerUsers += 1;
    ensureKeydownListener();
    return () => {
      store.listenerUsers -= 1;
      maybeRemoveKeydownListener();
    };
  }, []);
}
