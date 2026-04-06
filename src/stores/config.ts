import { create } from "zustand";
import type { components as ApiComponents } from "@/types/api.ts";
import { client, extractData } from "@/lib/api";

type PreviewCapabilities = {
  text: boolean;
  markdown: boolean;
  pdf: boolean;
  image: boolean;
  video: boolean;
  audio: boolean;
  office: boolean;
  tex: boolean;
};

export type SystemCapabilities = ApiComponents["schemas"]["SystemCapabilities"] & {
  preview?: PreviewCapabilities;
};

interface ConfigState {
  capabilities: SystemCapabilities | null;
  isLoading: boolean;
  fetchCapabilities: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  capabilities: null,
  isLoading: false,
  fetchCapabilities: async () => {
    set({ isLoading: true });
    try {
      const data = await extractData<SystemCapabilities>(client.GET("/api/v1/system/backend-capabilities-handshake"));
      if (data) {
        set({ capabilities: data });
      }
    } catch (err) {
      console.error("Error fetching capabilities:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));
