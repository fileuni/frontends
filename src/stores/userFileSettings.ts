import { create } from "zustand";
import { client, extractData } from "@/lib/api";

let userSettingsPromise: Promise<UserFileSettings | null> | null = null;

export interface UserFileSettings {
  user_id?: string;
  pool_name?: string;
  base_dir?: string;
  storage_type?: string;
  storage_quota?: number;
  storage_used?: number;
  sftp_enable_password?: boolean;
  s3_access_key?: string | null;
  s3_secret_key?: string | null;
  thumbnail_disable_text: boolean;
  thumbnail_disable_markdown: boolean;
  thumbnail_disable_pdf: boolean;
  thumbnail_disable_image: boolean;
  thumbnail_disable_video: boolean;
  thumbnail_disable_audio: boolean;
  thumbnail_disable_office: boolean;
  thumbnail_disable_tex: boolean;
}

export type UserFileSettingsUpdate = Partial<Pick<UserFileSettings,
  | "pool_name"
  | "storage_quota"
  | "thumbnail_disable_text"
  | "thumbnail_disable_markdown"
  | "thumbnail_disable_pdf"
  | "thumbnail_disable_image"
  | "thumbnail_disable_video"
  | "thumbnail_disable_audio"
  | "thumbnail_disable_office"
  | "thumbnail_disable_tex"
>>;

interface UserFileSettingsState {
  settings: UserFileSettings | null;
  isLoading: boolean;
  fetchSettings: (force?: boolean) => Promise<void>;
  updateSettings: (patch: UserFileSettingsUpdate) => Promise<void>;
}

export const useUserFileSettingsStore = create<UserFileSettingsState>((set, get) => ({
  settings: null,
  isLoading: false,
  fetchSettings: async (force = false) => {
    if (!force && get().settings) return;

    if (!force && userSettingsPromise) {
      await userSettingsPromise;
      return;
    }

    set({ isLoading: true });
    try {
      userSettingsPromise = extractData<UserFileSettings>(client.GET("/api/v1/file/user-settings"))
        .then((data) => data)
        .catch((err) => {
          console.error("Error fetching user file settings", err);
          return null;
        });

      const settings = await userSettingsPromise;
      if (settings) {
        set({ settings });
      }
    } catch (err) {
      console.error("Error fetching user file settings", err);
    } finally {
      userSettingsPromise = null;
      set({ isLoading: false });
    }
  },
  updateSettings: async (patch) => {
    const previous = get().settings;
    set({ settings: previous ? { ...previous, ...patch } : (patch as UserFileSettings) });
    try {
      const { data, error } = await client.PUT("/api/v1/file/user-settings", { body: patch });
      if (!data?.['success']) {
        set({ settings: previous || null });
        console.error("Failed to update user file settings", error || data?.['msg']);
      }
    } catch (err) {
      set({ settings: previous || null });
      console.error("Error updating user file settings", err);
    }
  }
}));
