import React from "react";
import { X } from "lucide-react";
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";

type PerformanceProfile = "low-concurrency" | "high-concurrency";

interface PerformanceProfilePickerModalProps {
  isOpen: boolean;
  value: PerformanceProfile;
  onClose: () => void;
  onSelect: (value: PerformanceProfile) => void;
  zIndexClassName?: string;
}

export const PerformanceProfilePickerModal: React.FC<
  PerformanceProfilePickerModalProps
> = ({ isOpen, value, onClose, onSelect, zIndexClassName = "z-[190]" }) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";

  if (!isOpen) {
    return null;
  }

  return (
    <GlassModalShell
      title={t("admin.config.quickSettings.performance.loadProfile.title")}
      subtitle={t("admin.config.quickSettings.performance.loadProfile.desc")}
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      panelClassName={cn(
        "rounded-2xl shadow-lg",
        isDark
          ? "bg-slate-950 border-white/10 text-slate-100"
          : "bg-white border-slate-200 text-slate-900"
      )}
      bodyClassName="p-4"
      overlayClassName="bg-black/70"
      zIndexClassName={zIndexClassName}
      containerClassName="p-4"
      closeButton={(
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
            isDark
              ? "border-white/10 bg-white/[0.03] text-slate-100"
              : "border-slate-200 bg-slate-50 text-slate-800"
          )}
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X size={18} />
        </button>
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(["low-concurrency", "high-concurrency"] as const).map((profile) => {
          const active = value === profile;
          return (
            <button
              key={profile}
              type="button"
              onClick={() => {
                onSelect(profile);
                onClose();
              }}
              className={cn(
                "rounded-2xl border px-4 py-4 text-left transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10"
                  : isDark
                    ? "border-white/10 bg-slate-950/40 text-slate-200 hover:bg-white/[0.04]"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100",
              )}
            >
              <div className="text-sm font-black">
                {t(
                  `admin.config.quickSettings.performance.loadProfile.${profile}`,
                )}
              </div>
              <div
                className={cn(
                  "mt-2 text-xs leading-5",
                  active
                    ? "text-primary/90"
                    : isDark
                      ? "text-slate-300"
                      : "text-slate-500",
                )}
              >
                {profile === "low-concurrency"
                  ? t(
                      "admin.config.quickSettings.performance.loadProfile.lowConcurrencyDesc",
                    )
                  : t(
                      "admin.config.quickSettings.performance.loadProfile.highConcurrencyDesc",
                    )}
              </div>
            </button>
          );
        })}
      </div>
    </GlassModalShell>
  );
};
