import { useEffect, useRef } from 'react';

const isSaveHotkey = (event: KeyboardEvent): boolean => {
  const key = event.key.toLowerCase();
  if (key !== 's' || event.shiftKey || event.isComposing) {
    return false;
  }

  const isPrimarySave = (event.ctrlKey || event.metaKey) && !event.altKey;
  const isAlternativeSave = event.altKey && !event.ctrlKey && !event.metaKey;
  return isPrimarySave || isAlternativeSave;
};

export const useEditorSaveHotkey = ({
  enabled,
  onSave,
}: {
  enabled: boolean;
  onSave: () => void | Promise<void>;
}): void => {
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !isSaveHotkey(event)) {
        return;
      }

      event.preventDefault();
      void onSaveRef.current();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
};
