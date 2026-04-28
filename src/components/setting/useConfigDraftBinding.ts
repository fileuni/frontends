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
  debounceMs: _debounceMs = 180,
}: UseConfigDraftBindingOptions<T>) => {
  const [draft, setDraftState] = useState<T>(() => createDraft(content));
  const draftRef = useRef(draft);
  const contentRef = useRef(content);
  const onContentChangeRef = useRef(onContentChange);
  const buildContentRef = useRef(buildContent);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);

  useEffect(() => {
    buildContentRef.current = buildContent;
  }, [buildContent]);

  useEffect(() => {
    contentRef.current = content;
    if (!active) {
      return;
    }
    const nextDraft = createDraft(content);
    draftRef.current = nextDraft;
    setDraftState(nextDraft);
  }, [active, content, createDraft]);

  const flushDraft = useCallback(() => {
    const nextContent = buildContentRef.current(contentRef.current, draftRef.current);
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

  const setDraft = useCallback((updater: DraftUpdater<T>) => {
    const next = typeof updater === 'function'
      ? (updater as (prev: T) => T)(draftRef.current)
      : updater;
    draftRef.current = next;
    setDraftState(next);
    const nextContent = buildContentRef.current(contentRef.current, next);
    if (nextContent !== contentRef.current) {
      contentRef.current = nextContent;
      onContentChangeRef.current(nextContent);
    }
  }, []);

  return {
    draft,
    setDraft,
    flushDraft,
  };
};
