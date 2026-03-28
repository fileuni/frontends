import { useCallback, useEffect, useRef, useState } from 'react';

type DraftUpdater<T> = T | ((prev: T) => T);

interface UseConfigDraftBindingOptions<T> {
  active?: boolean;
  content: string;
  onContentChange: (value: string) => void;
  createDraft: (content: string) => T;
  buildContent: (content: string, draft: T) => string;
  debounceMs?: number;
}

export const useConfigDraftBinding = <T>({
  active = true,
  content,
  onContentChange,
  createDraft,
  buildContent,
  debounceMs = 180,
}: UseConfigDraftBindingOptions<T>) => {
  const [draft, setDraftState] = useState<T>(() => createDraft(content));
  const draftRef = useRef(draft);
  const contentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);
  const buildContentRef = useRef(buildContent);
  const debounceMsRef = useRef(debounceMs);
  const timerRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    buildContentRef.current = buildContent;
  }, [buildContent]);

  useEffect(() => {
    debounceMsRef.current = debounceMs;
  }, [debounceMs]);

  useEffect(() => {
    contentRef.current = content;
    if (!active) {
      return;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    dirtyRef.current = false;
    const nextDraft = createDraft(content);
    draftRef.current = nextDraft;
    setDraftState(nextDraft);
  }, [active, content, createDraft]);

  const flushDraft = useCallback(() => {
    if (!dirtyRef.current) {
      return;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const nextContent = buildContentRef.current(contentRef.current, draftRef.current);
    dirtyRef.current = false;
    if (nextContent !== contentRef.current) {
      contentRef.current = nextContent;
      onContentChangeRef.current(nextContent);
    }
  }, []);

  useEffect(() => {
    return () => {
      flushDraft();
    };
  }, [flushDraft]);

  useEffect(() => {
    if (!active) {
      flushDraft();
    }
  }, [active, flushDraft]);

  const scheduleFlush = useCallback(() => {
    if (typeof window === 'undefined') {
      flushDraft();
      return;
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      flushDraft();
    }, debounceMsRef.current);
  }, [flushDraft]);

  const setDraft = useCallback((updater: DraftUpdater<T>) => {
    dirtyRef.current = true;
    setDraftState((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (prev: T) => T)(prev)
        : updater;
      draftRef.current = next;
      return next;
    });
    scheduleFlush();
  }, [scheduleFlush]);

  return {
    draft,
    setDraft,
    flushDraft,
  };
};
