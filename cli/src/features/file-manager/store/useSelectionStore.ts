import { create } from 'zustand';

interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedId: string | null;
  
  toggleSelection: (id: string, isCtrl?: boolean, isShift?: boolean, allIds?: string[]) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedIds: new Set<string>(),
  lastSelectedId: null,

  toggleSelection: (id, isCtrl = false, isShift = false, allIds = []) => set(state => {
    const newSelection = new Set(state.selectedIds);
    
    if (isShift && state.lastSelectedId && allIds.length > 0) {
      // Shift 连选逻辑
      const startIdx = allIds.indexOf(state.lastSelectedId);
      const endIdx = allIds.indexOf(id);
      if (startIdx !== -1 && endIdx !== -1) {
        const [min, max] = [Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)];
        const slice = allIds.slice(min, max + 1);
        slice.forEach(p => newSelection.add(p));
        return { selectedIds: newSelection, lastSelectedId: id };
      }
    }

    if (isCtrl) {
      // Ctrl 反选逻辑
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
    } else {
      // 普通点击：清空其他并选择当前
      newSelection.clear();
      newSelection.add(id);
    }

    return { selectedIds: newSelection, lastSelectedId: id };
  }),

  selectAll: (ids) => set({ 
    selectedIds: new Set(ids),
    lastSelectedId: ids[ids.length - 1] || null
  }),

  deselectAll: () => set({ 
    selectedIds: new Set(),
    lastSelectedId: null
  }),

  isSelected: (id) => get().selectedIds.has(id),
}));