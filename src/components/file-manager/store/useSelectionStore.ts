import { create } from 'zustand';
import type { FileInfo, FileManagerMode } from '../types/index.ts';

export const getSelectionId = (
  file: Pick<FileInfo, 'path' | 'id'>,
  fmMode: FileManagerMode,
): string => (fmMode === 'shares' && file.id ? file.id : file.path);

interface SelectionState {
  selectedIds: Set<string>;
  rangeAnchorId: string | null;

  toggleSelection: (id: string, isCtrl?: boolean, isShift?: boolean, allIds?: string[]) => void;
  selectAll: (ids: string[]) => void;
  setSelection: (ids: string[]) => void;
  setRangeAnchor: (id: string | null) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set<string>(),
  rangeAnchorId: null,

  toggleSelection: (id, isCtrl = false, isShift = false, allIds = []) => set((state) => {
    if (isShift && state.rangeAnchorId && allIds.length > 0) {
      const startIdx = allIds.indexOf(state.rangeAnchorId);
      const endIdx = allIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        return {
          selectedIds: new Set(allIds.slice(min, max + 1)),
          rangeAnchorId: state.rangeAnchorId,
        };
      }
    }

    if (isCtrl) {
      const nextSelection = new Set(state.selectedIds);
      if (nextSelection.has(id)) {
        nextSelection.delete(id);
      } else {
        nextSelection.add(id);
      }
      return {
        selectedIds: nextSelection,
        rangeAnchorId: state.rangeAnchorId,
      };
    }

    return {
      selectedIds: new Set([id]),
      rangeAnchorId: id,
    };
  }),

  selectAll: (ids) => set((state) => ({
    selectedIds: new Set(ids),
    rangeAnchorId: state.rangeAnchorId ?? ids[0] ?? null,
  })),

  setSelection: (ids) => set({
    selectedIds: new Set(ids),
  }),

  setRangeAnchor: (id) => set({
    rangeAnchorId: id,
  }),

  deselectAll: () => set({
    selectedIds: new Set(),
    rangeAnchorId: null,
  }),

  isSelected: (id) => get().selectedIds.has(id),
}));
