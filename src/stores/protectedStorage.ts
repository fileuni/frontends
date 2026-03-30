import { create } from "zustand";
import { client, extractData } from "@/lib/api";
import type { SystemCapabilities } from "@/stores/config";

export interface ProtectedStorageStatus {
  enabled: boolean;
  protected_root?: string | null;
  protected_mode?: string | null;
  global_mode: string;
  subdir_trash_disabled: boolean;
  subdir_thumbnail_disabled: boolean;
}

interface ProtectedStorageState {
  status: ProtectedStorageStatus | null;
  isLoading: boolean;
  syncFromCapabilities: (capabilities: SystemCapabilities | null) => void;
  fetchStatus: (force?: boolean) => Promise<void>;
}

const fallbackFromCapabilities = (
  capabilities: SystemCapabilities | null,
): ProtectedStorageStatus => ({
  enabled: false,
  protected_root: null,
  protected_mode: null,
  global_mode: capabilities?.protected_storage?.global_mode || "disabled",
  subdir_trash_disabled:
    capabilities?.protected_storage?.subdir_trash_disabled ?? true,
  subdir_thumbnail_disabled:
    capabilities?.protected_storage?.subdir_thumbnail_disabled ?? true,
});

export const useProtectedStorageStore = create<ProtectedStorageState>((set, get) => ({
  status: null,
  isLoading: false,
  syncFromCapabilities: (capabilities) => {
    set((state) => ({
      status: state.status
        ? {
            ...state.status,
            global_mode: capabilities?.protected_storage?.global_mode || "disabled",
            subdir_trash_disabled:
              capabilities?.protected_storage?.subdir_trash_disabled ?? true,
            subdir_thumbnail_disabled:
              capabilities?.protected_storage?.subdir_thumbnail_disabled ?? true,
          }
        : fallbackFromCapabilities(capabilities),
    }));
  },
  fetchStatus: async (force = false) => {
    if (!force && get().status) return;
    set({ isLoading: true });
    try {
      const data = await extractData<ProtectedStorageStatus>(
        client.GET("/api/v1/file/protected-storage/status"),
      );
      set({ status: data });
    } catch {
      set((state) => ({ status: state.status ?? fallbackFromCapabilities(null) }));
    } finally {
      set({ isLoading: false });
    }
  },
}));
