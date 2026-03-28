import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
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

  useEscapeToCloseTopLayer({ active: isOpen, onEscape: onClose });

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4",
        zIndexClassName,
      )}
    >
      <button
        type="button"
        aria-label={t("common.close")}
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-xl rounded-2xl border p-4 shadow-lg",
          isDark
            ? "border-white/10 bg-slate-950 text-slate-100"
            : "border-slate-200 bg-white text-slate-900",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className={cn(
                "text-sm font-black uppercase tracking-[0.18em]",
                isDark ? "text-slate-100" : "text-slate-900",
              )}
            >
              {t("admin.config.quickSettings.performance.loadProfile.title")}
            </div>
            <div
              className={cn(
                "mt-2 text-sm leading-6",
                isDark ? "text-slate-300" : "text-slate-600",
              )}
            >
              {t("admin.config.quickSettings.performance.loadProfile.desc")}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
              isDark
                ? "border-white/10 bg-white/[0.03] text-slate-100"
                : "border-slate-200 bg-slate-50 text-slate-800",
            )}
            aria-label={t("common.close")}
            title={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
      </div>
    </div>
  );
};
