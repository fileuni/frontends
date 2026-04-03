import { open } from "@tauri-apps/plugin-dialog";
import {
  ConfigPathSelector,
  type RuntimeDirValue,
} from "@/apps/launcher/components/ConfigPathSelector";
import { safeInvoke } from "./tauri";

interface RuntimeDirPresets {
  current_runtime_dir: string;
  default_runtime_dir: string;
}

interface ConfigSelectorProps {
  isOpen: boolean;
  onRuntimeDirSelected: (runtimeDir: string) => Promise<void>;
  onClose: () => void;
  canClose?: boolean;
  currentValue?: RuntimeDirValue;
  presets: RuntimeDirPresets | null;
}

export default function ConfigSelector({
  isOpen,
  onRuntimeDirSelected,
  onClose,
  canClose = true,
  currentValue,
  presets,
}: ConfigSelectorProps) {
  const ensureNativeDialogReady = async () => {
    const ready = await safeInvoke<boolean>("prepare_native_file_dialog");
    if (!ready) {
      throw new Error(
        "Native file dialog is unavailable. Please enter the run data directory manually.",
      );
    }
  };

  return (
    <ConfigPathSelector
      isOpen={isOpen}
      onClose={onClose}
      canClose={canClose}
      initialValue={currentValue}
      currentPreset={
        presets ? { runtimeDir: presets.current_runtime_dir } : undefined
      }
      defaultPreset={
        presets ? { runtimeDir: presets.default_runtime_dir } : undefined
      }
      onBrowsePath={async () => {
        await ensureNativeDialogReady();
        const selected = await open({
          directory: true,
          multiple: false,
        });
        return typeof selected === "string" ? selected : null;
      }}
      onValidatePath={async (value) => {
        try {
          const valid = await safeInvoke<boolean>("validate_runtime_dir", {
            runtimeDir: value.runtimeDir,
          });
          return { valid };
        } catch (errorValue: unknown) {
          return {
            valid: false,
            error:
              errorValue instanceof Error
                ? errorValue.message
                : String(errorValue),
          };
        }
      }}
      onPreparePath={async () => undefined}
      onConfirmPath={async (value) => {
        await onRuntimeDirSelected(value.runtimeDir);
      }}
    />
  );
}
