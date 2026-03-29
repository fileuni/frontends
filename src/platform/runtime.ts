export type UiRuntime = "web" | "tauri";

const hasTauriGlobals = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const w = window as unknown as Record<string, unknown>;

  // Tauri injects runtime globals in both devUrl and bundled modes.
  // We avoid importing '@tauri-apps/api' in the main web bundle.
  return Boolean(
    w['__TAURI__'] ||
      w['__TAURI_INTERNALS__'] ||
      w['__TAURI_IPC__'] ||
      w['__TAURI_METADATA__']
  );
};

export const detectUiRuntime = (): UiRuntime => {
  return hasTauriGlobals() ? "tauri" : "web";
};

export const isTauriRuntime = (): boolean => detectUiRuntime() === "tauri";
