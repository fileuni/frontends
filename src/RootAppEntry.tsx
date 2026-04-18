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
    const interval = window.setInterval(() => {
      setRuntime((current) => {
        if (current === 'tauri') {
          return current;
        }
        return detectUiRuntime();
      });
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <div data-testid="root-app-runtime" data-runtime={runtime} data-entry="RootAppEntry" hidden />
      {runtime === 'tauri' ? <TauriLauncher /> : <WebApp />}
    </>
  );
}

export default RootAppEntry;
