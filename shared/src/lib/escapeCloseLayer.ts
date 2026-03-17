import { useEffect, useRef } from 'react';

type EscapeLayer = {
  id: string;
  enabled: boolean;
  onEscape: () => void;
};

const ESC_LAYERS: EscapeLayer[] = [];

let idSeq = 0;
const nextId = () => {
  idSeq += 1;
  return `esc-layer-${idSeq}`;
};

const removeLayer = (id: string) => {
  const idx = ESC_LAYERS.findIndex((layer) => layer.id === id);
  if (idx >= 0) {
    ESC_LAYERS.splice(idx, 1);
  }
};

const upsertLayer = (layer: EscapeLayer) => {
  const idx = ESC_LAYERS.findIndex((it) => it.id === layer.id);
  if (idx >= 0) {
    ESC_LAYERS[idx] = layer;
    return;
  }
  ESC_LAYERS.push(layer);
};

export const isAnyEscLayerOpen = (): boolean => ESC_LAYERS.length > 0;

export interface UseEscapeToCloseTopLayerOptions {
  active: boolean;
  enabled?: boolean;
  onEscape: () => void;
}

// Registers an "Escape closable" layer. When Escape is pressed, only the top-most
// active layer gets the event. If the top layer is disabled, Escape is swallowed.
export const useEscapeToCloseTopLayer = (options: UseEscapeToCloseTopLayerOptions) => {
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (ESC_LAYERS.length === 0) {
        return;
      }

      const top = ESC_LAYERS[ESC_LAYERS.length - 1];
      if (!top) {
        return;
      }

      // Swallow Escape if any top-layer is open; only the top one can handle it.
      event.preventDefault();
      event.stopPropagation();

      if (top.enabled) {
        top.onEscape();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true } as AddEventListenerOptions);
    };
  }, []);
};
