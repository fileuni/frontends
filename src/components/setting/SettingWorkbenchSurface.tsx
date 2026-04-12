import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfigWorkbenchShell } from "./ConfigWorkbenchShell";
import { SettingOverview, type SettingActionItem } from "./SettingOverview";
import {
  SystemConfigWorkbench,
  type SystemConfigWorkbenchProps,
} from "./SystemConfigWorkbench";

type ViewMode = "visual" | "raw";

interface HeaderAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface SettingWorkbenchSurfaceProps {
  title: string;
  configPath?: string | null;
  configPathAction?: React.ReactNode;
  headerExtras?: React.ReactNode;
  onClose?: () => void;
  closeAriaLabel?: string;
  bodyClassName?: string;
  initialViewMode?: ViewMode;
  settingActions: SettingActionItem[];
  testAction: HeaderAction;
  primaryAction: HeaderAction;
  workbenchProps: Omit<
    SystemConfigWorkbenchProps,
    | "settingsCenterMode"
    | "quickSettingsEnabled"
    | "hideShortcuts"
    | "hideEditorToolbar"
    | "hideEditorPath"
    | "setupViewMode"
    | "onSetupViewChange"
  >;
}

export const SettingWorkbenchSurface: React.FC<
  SettingWorkbenchSurfaceProps
> = ({
  title,
  configPath,
  configPathAction,
  headerExtras,
  onClose,
  closeAriaLabel,
  bodyClassName = "p-2 sm:p-3 lg:p-4",
  initialViewMode = "visual",
  settingActions,
  testAction,
  primaryAction,
  workbenchProps,
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const headerActions = (
    <div className="flex w-full flex-wrap items-stretch gap-2 lg:w-auto lg:justify-end">
      <button
        type="button"
        onClick={testAction.onClick}
        disabled={testAction.disabled}
        className="h-9 min-w-0 flex-1 rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/10 sm:flex-none sm:px-4"
      >
        {testAction.label}
      </button>
      <button
        type="button"
        onClick={primaryAction.onClick}
        disabled={primaryAction.disabled}
        className="h-9 min-w-0 flex-1 rounded-full bg-primary px-3 text-sm font-black text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50 sm:flex-none sm:px-4"
      >
        {primaryAction.label}
      </button>
      <div className="inline-flex w-full min-w-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[0.03] sm:w-auto sm:justify-start">
        <button
          type="button"
          onClick={() => setViewMode("visual")}
          className={`h-9 min-w-0 flex-1 rounded-full px-3 text-sm font-black transition-colors sm:flex-none ${
            viewMode === "visual"
              ? "bg-primary text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
          }`}
        >
          {t("systemConfig.setup.editor.visualMode")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("raw")}
          className={`h-9 min-w-0 flex-1 rounded-full px-3 text-sm font-black transition-colors sm:flex-none ${
            viewMode === "raw"
              ? "bg-primary text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/10"
          }`}
        >
          {t("systemConfig.setup.editor.sourceMode")}
        </button>
      </div>
      {headerExtras}
    </div>
  );

  const showVisual = viewMode === "visual" && !workbenchProps.loading;

  return (
    <ConfigWorkbenchShell
      title={title}
      configPath={configPath}
      configPathAction={configPathAction}
      headerActions={headerActions}
      onClose={onClose}
      closeAriaLabel={closeAriaLabel}
      bodyClassName={bodyClassName}
    >
      {showVisual ? (
        <SettingOverview commonActions={settingActions} />
      ) : (
        <SystemConfigWorkbench
          {...workbenchProps}
          quickSettingsEnabled={false}
          settingsCenterMode={false}
          setupViewMode={viewMode}
          onSetupViewChange={(mode) => setViewMode(mode)}
          hideShortcuts={true}
          hideEditorToolbar={true}
          hideEditorPath={true}
        />
      )}
    </ConfigWorkbenchShell>
  );
};
