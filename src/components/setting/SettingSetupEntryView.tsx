import React from "react";
import { useTranslation } from "react-i18next";
import { FileCheck, KeyRound, Settings, Sparkles } from "lucide-react";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";
import { AdminPasswordInlinePanel } from "./SettingInlineExternalPanels";

export interface SettingSetupEntryViewProps {
  mode: "first-start" | "existing-config";
  busy?: boolean;
  onPrimary: () => void;
  onCustomize: () => void;
  pendingAdminPassword: string;
  onPendingAdminPasswordChange: (value: string) => void;
  passwordHint?: string;
}

export const SettingSetupEntryView: React.FC<SettingSetupEntryViewProps> = ({
  mode,
  busy = false,
  onPrimary,
  onCustomize,
  pendingAdminPassword,
  onPendingAdminPasswordChange,
  passwordHint,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";

  const isFirstStart = mode === "first-start";
  const title = isFirstStart
    ? t([
        "systemConfig.setup.guide.title",
        "systemConfig.setup.center.title",
        "admin.config.title",
      ])
    : t("systemConfig.setup.guide.existingConfigTitle");
  const description = isFirstStart
    ? t([
        "systemConfig.setup.guide.desc",
        "systemConfig.setup.center.subtitle",
        "systemConfig.setup.guide.requiredPrompt",
      ])
    : t("systemConfig.setup.guide.existingConfigDesc");
  const primaryLabel = isFirstStart
    ? t([
        "systemConfig.setup.guide.defaultApplyAction",
        "systemConfig.setup.guide.card3Action",
      ])
    : t("systemConfig.setup.guide.existingConfigApply");
  const customizeLabel = t([
    "systemConfig.setup.guide.existingConfigCustomize",
    "systemConfig.setup.guide.openAction",
  ]);
  const passwordTitle = t([
    "systemConfig.setup.admin.changePassword",
    "systemConfig.setup.admin.title",
    "admin.config.quickSettings.actions.setAdminPassword",
  ]);

  const heroCard = (
    <div
      className={cn(
        "rounded-3xl border p-6 sm:p-8",
        isDark
          ? "border-white/10 bg-slate-950"
          : "border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-white",
        isFirstStart ? "text-left" : "text-center",
      )}
    >
      <div
        className={cn(
          "inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-6",
          isDark ? "bg-sky-500/15 text-sky-200" : "bg-sky-100 text-sky-700",
          !isFirstStart && "mx-auto",
        )}
      >
        {isFirstStart ? <Sparkles size={24} /> : <FileCheck size={24} />}
      </div>
      <h2
        className={cn(
          isFirstStart ? "text-2xl sm:text-3xl" : "text-2xl",
          "font-black tracking-tight",
          isDark ? "text-slate-100" : "text-slate-900",
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "mt-4 text-sm sm:text-base leading-7",
          isFirstStart ? "max-w-2xl" : "max-w-lg mx-auto",
          isDark ? "text-slate-300" : "text-slate-700",
        )}
      >
        {description}
      </p>
      <div
        className={cn(
          "mt-8 flex flex-wrap items-center gap-3",
          !isFirstStart && "justify-center",
        )}
      >
        <button
          type="button"
          onClick={onPrimary}
          disabled={busy}
          className="h-11 px-8 rounded-2xl bg-primary text-white text-sm font-black shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? t("common.processing") : primaryLabel}
        </button>
        <button
          type="button"
          onClick={onCustomize}
          className={cn(
            "h-11 px-6 rounded-2xl border text-sm font-black transition-colors",
            isDark
              ? "border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <Settings size={15} className="inline mr-2" />
          {customizeLabel}
        </button>
      </div>
    </div>
  );

  const passwordCard = (
    <div
      className={cn(
        "rounded-3xl border p-5 sm:p-6",
        isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl",
            isDark ? "bg-cyan-500/15 text-cyan-200" : "bg-cyan-100 text-cyan-700",
          )}
        >
          <KeyRound size={18} />
        </div>
        <h3
          className={cn(
            "text-lg font-black",
            isDark ? "text-slate-100" : "text-slate-900",
          )}
        >
          {passwordTitle}
        </h3>
      </div>
      <AdminPasswordInlinePanel
        value={pendingAdminPassword}
        onValueChange={onPendingAdminPasswordChange}
        hint={passwordHint}
      />
    </div>
  );

  if (isFirstStart) {
    return (
      <div className="max-w-5xl mx-auto grid gap-6 p-2 sm:p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {heroCard}
        {passwordCard}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-2 sm:p-4">
      {heroCard}
      {passwordCard}
    </div>
  );
};
