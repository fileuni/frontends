import React from "react";
import { useTranslation } from "react-i18next";

export interface VersionUpgradeStatusView {
  state:
    | "ready"
    | "config_missing"
    | "upgrade_required"
    | "downgrade_blocked"
    | "manual_intervention_required";
  program_version: string;
  target_version: string;
  config_version?: string | null;
  schema_version?: string | null;
  planned_steps: VersionUpgradePlanStepView[];
  uses_major_upgrade_bridge: boolean;
  can_auto_upgrade: boolean;
  requires_upgrade: boolean;
}

export interface VersionUpgradePlanStepView {
  from_version: string;
  to_version: string;
  label: string;
  kind:
    | "bootstrap_legacy_runtime"
    | "consecutive_release"
    | "major_upgrade_bridge";
}

interface VersionUpgradeModalProps {
  isOpen: boolean;
  status: VersionUpgradeStatusView | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const valueOrFallback = (
  value: string | null | undefined,
  fallback: string,
): string => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export const VersionUpgradeModal: React.FC<VersionUpgradeModalProps> = ({
  isOpen,
  status,
  busy,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();

  if (!isOpen || !status) {
    return null;
  }

  const stepKindLabel = (kind: VersionUpgradePlanStepView["kind"]): string => {
    switch (kind) {
      case "bootstrap_legacy_runtime":
        return t("launcher.upgrade.stepBootstrapLegacyRuntime");
      case "major_upgrade_bridge":
        return t("launcher.upgrade.stepMajorUpgradeBridge");
      case "consecutive_release":
      default:
        return t("launcher.upgrade.stepConsecutiveRelease");
    }
  };

  const description =
    status.state === "downgrade_blocked"
      ? t("launcher.upgrade.downgradeBlocked")
      : status.state === "manual_intervention_required"
        ? t("launcher.upgrade.manualBlocked")
        : t("launcher.upgrade.requiredDescription");

  return (
    <div
      className="fixed inset-0 z-[170] bg-black/72 flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl rounded-3xl border border-amber-300/40 bg-white/95 dark:bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]">
        <div className="px-6 py-5 border-b border-slate-200/70 dark:border-slate-700/60 shrink-0">
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
            {t("launcher.upgrade.title")}
          </h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-5 space-y-5">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>

          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200">
              {t("launcher.upgrade.backupTitle")}
            </p>
            <div className="mt-3 space-y-2 text-sm leading-6 text-amber-900 dark:text-amber-100">
              <p>1. {t("launcher.upgrade.backupDatabase")}</p>
              <p>2. {t("launcher.upgrade.backupRuntimeDir")}</p>
              <p>3. {t("launcher.upgrade.backupUserFiles")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-700/60 dark:bg-slate-950/40 space-y-3">
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-black text-slate-500 dark:text-slate-400">
                {t("launcher.upgrade.binaryVersion")}
              </span>
              <span className="font-mono text-right text-slate-800 dark:text-slate-100 break-all">
                {valueOrFallback(
                  status.program_version,
                  t("launcher.upgrade.missingValue"),
                )}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-black text-slate-500 dark:text-slate-400">
                {t("launcher.upgrade.environmentVersion")}
              </span>
              <span className="font-mono text-right text-slate-800 dark:text-slate-100 break-all">
                {valueOrFallback(
                  status.config_version,
                  t("launcher.upgrade.missingValue"),
                )}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-black text-slate-500 dark:text-slate-400">
                {t("launcher.upgrade.targetVersion")}
              </span>
              <span className="font-mono text-right text-slate-800 dark:text-slate-100 break-all">
                {valueOrFallback(
                  status.target_version,
                  t("launcher.upgrade.missingValue"),
                )}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="font-black text-slate-500 dark:text-slate-400">
                {t("launcher.upgrade.schemaVersion")}
              </span>
              <span className="font-mono text-right text-slate-800 dark:text-slate-100 break-all">
                {valueOrFallback(
                  status.schema_version,
                  t("launcher.upgrade.missingValue"),
                )}
              </span>
            </div>
          </div>

          {status.planned_steps.length > 0 && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 dark:border-slate-700/60 dark:bg-slate-950/40 space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t("launcher.upgrade.planTitle")}
              </p>
              <div className="space-y-3">
                {status.planned_steps.map((step) => (
                  <div
                    key={`${step.from_version}-${step.to_version}-${step.label}`}
                    className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {step.label}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {stepKindLabel(step.kind)}
                        </p>
                      </div>
                      <span className="font-mono text-xs text-right text-slate-700 dark:text-slate-200 break-all">
                        {step.from_version} -&gt; {step.to_version}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status.uses_major_upgrade_bridge && (
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/90 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
              <p className="text-sm leading-6 text-rose-900 dark:text-rose-100">
                {t("launcher.upgrade.majorBridgeWarning")}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-end gap-3 bg-slate-50/80 dark:bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("common.close")}
          </button>
          {status.can_auto_upgrade && status.requires_upgrade && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy
                ? t("launcher.upgrade.upgrading")
                : t("launcher.upgrade.confirm")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionUpgradeModal;
