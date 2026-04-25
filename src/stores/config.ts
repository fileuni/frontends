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

type ThumbnailCapabilities = ApiComponents["schemas"]["ThumbnailCapabilities"] & {
  allowed_directory_modes?: string[];
  default_directory_mode?: string;
  allow_user_directory_mode_override?: boolean;
  allow_user_show_hidden_thumbnail_dirs?: boolean;
  default_show_thumbnail_directories?: boolean;
};

export type BrandingConfig = {
  logo_url?: string | null;
  logo_name?: string | null;
  footer_text?: string | null;
};

export type SystemCapabilities = Omit<ApiComponents["schemas"]["SystemCapabilities"], "thumbnail"> & {
  preview?: PreviewCapabilities;
  branding?: BrandingConfig;
  thumbnail?: ThumbnailCapabilities;
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
