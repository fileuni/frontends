import React from 'react';
import { detectUiRuntime, type UiRuntime } from '@/platform/runtime';
import { App as WebApp } from '@/apps/webui/App';
import { Launcher as TauriLauncher } from '@/apps/launcher/Launcher';

export function RootAppEntry() {
  const [runtime] = React.useState<UiRuntime>(() => detectUiRuntime());
  return runtime === 'tauri' ? <TauriLauncher /> : <WebApp />;
}

export default RootAppEntry;
