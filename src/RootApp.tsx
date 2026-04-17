import React from "react";
import { detectUiRuntime, type UiRuntime } from "@/platform/runtime";

const WebApp = React.lazy(() =>
  import("@/apps/webui/App").then((m) => ({
    default: m.App,
  }))
);

const TauriLauncher = React.lazy(() =>
  import("@/apps/launcher/Launcher").then((m) => ({
    default: m.Launcher,
  }))
);

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-b-primary animate-spin" />
    </div>
  );
};

/**
 * Single entry for both WebUI (/) and Tauri launcher.
 */
export const RootApp: React.FC = () => {
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

  return (
    <React.Suspense fallback={<LoadingScreen />}>
      {runtime === "tauri" ? <TauriLauncher /> : <WebApp />}
    </React.Suspense>
  );
};

export default RootApp;
