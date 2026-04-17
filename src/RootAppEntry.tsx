import React from 'react';
import { detectUiRuntime, type UiRuntime } from '@/platform/runtime';
import { App as WebApp } from '@/apps/webui/App';
import { Launcher as TauriLauncher } from '@/apps/launcher/Launcher';

export function RootAppEntry() {
  const [runtime, setRuntime] = React.useState<UiRuntime>(() => detectUiRuntime());

  React.useEffect(() => {
    const syncRuntime = () => {
      setRuntime(detectUiRuntime());
    };

    syncRuntime();
    window.addEventListener('hashchange', syncRuntime);

    return () => {
      window.removeEventListener('hashchange', syncRuntime);
    };
  }, []);

  return runtime === 'tauri' ? <TauriLauncher /> : <WebApp />;
}

export default RootAppEntry;
