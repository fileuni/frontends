import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { ConfigPathSelector } from '@fileuni/shared';

interface ConfigSelectorProps {
  isOpen: boolean;
  onConfigSelected: (path: string) => void;
  onClose: () => void;
  canClose?: boolean;
}

export default function ConfigSelector({
  isOpen,
  onConfigSelected,
  onClose,
  canClose = true,
}: ConfigSelectorProps) {
  const ensureNativeDialogReady = async () => {
    const ready = await invoke<boolean>('prepare_native_file_dialog');
    if (!ready) {
      throw new Error('Native file dialog is unavailable. Please enter the config path manually.');
    }
  };

  return (
    <ConfigPathSelector
      isOpen={isOpen}
      onClose={onClose}
      canClose={canClose}
      onBrowsePath={async () => {
        await ensureNativeDialogReady();
        const selected = await open({
          multiple: false,
          filters: [{ name: 'TOML Config', extensions: ['toml'] }],
        });
        return typeof selected === 'string' ? selected : null;
      }}
      onCreateExamplePath={async () => {
        await ensureNativeDialogReady();
        const savePath = await save({
          filters: [{ name: 'TOML Config', extensions: ['toml'] }],
          defaultPath: 'config-fileuni.toml',
        });
        if (!savePath) {
          return null;
        }
        return await invoke<string>('create_example_config', { path: savePath });
      }}
      onValidatePath={async (path) => {
        try {
          const valid = await invoke<boolean>('validate_config_file', { path });
          return { valid };
        } catch (errorValue: unknown) {
          return {
            valid: false,
            error: errorValue instanceof Error ? errorValue.message : String(errorValue),
          };
        }
      }}
      onConfirmPath={async (path) => {
        onConfigSelected(path);
      }}
    />
  );
}
