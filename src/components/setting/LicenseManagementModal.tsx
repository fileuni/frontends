//  License Management Modal
//  Standalone modal for viewing license status and applying license keys.

import React from "react";
import { useTranslation } from "react-i18next";
import { X, Shield, Users, Fingerprint, Key, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useEscapeToCloseTopLayer } from "@/hooks/useEscapeToCloseTopLayer";
import { Button } from "@/components/ui/Button";

export interface LicenseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  isValid: boolean;
  statusMessage?: string | undefined;
  currentUsers: number;
  maxUsers: number;
  deviceCode: string;
  hwId?: string | undefined;
  auxId?: string | undefined;
  licenseKey: string;
  saving: boolean;
  onLicenseKeyChange: (value: string) => void;
  onApplyLicense: () => void;
  expiresAt?: string | null | undefined;
  features?: string[] | undefined;
}

export const LicenseManagementModal: React.FC<LicenseManagementModalProps> = ({
  isOpen,
  onClose,
  isValid,
  statusMessage,
  currentUsers,
  maxUsers,
  deviceCode,
  hwId,
  auxId,
  licenseKey,
  saving,
  onLicenseKeyChange,
  onApplyLicense,
  expiresAt = null,
  features = [],
}) => {
  const { t, i18n } = useTranslation();
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === "dark";

  useEscapeToCloseTopLayer({
    active: isOpen,
    enabled: true,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const featureKey = (raw: string) => raw.replace(/[^A-Za-z0-9_-]/g, "_");
  const featureItems = features
    .map((code) => {
      const safe = featureKey(code);
      const base = `admin.config.license.featureCatalog.${safe}`;
      const title = t(`${base}.title`, { defaultValue: code });
      const desc = t(`${base}.desc`, { defaultValue: "" });
      return { code, title, desc };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  const expiresText = (() => {
    if (!expiresAt) return t("common.none");
    const dt = new Date(expiresAt);
    if (Number.isNaN(dt.getTime())) return expiresAt;
    try {
      return new Intl.DateTimeFormat(i18n.language || undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(dt);
    } catch {
      return dt.toLocaleString();
    }
  })();

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-2xl transition-all duration-300",
          isDark ? "bg-black/95" : "bg-slate-900/80",
        )}
        onClick={onClose}
      />

      <div
        className={cn(
          "relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300 min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)]",
          isDark
            ? "bg-slate-950 border-white/10 text-slate-100 ring-1 ring-white/5"
            : "bg-white border-gray-200 text-slate-900",
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center justify-between gap-2 border-b px-4 py-4 sm:px-6 shrink-0",
            isDark
              ? "border-white/10 bg-slate-900/50"
              : "border-slate-100 bg-slate-50/50",
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "p-2 rounded-lg",
                isDark ? "bg-amber-500/10" : "bg-amber-50",
              )}
            >
              <Key size={18} className="text-amber-500 shrink-0" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black uppercase tracking-widest truncate">
                {t("admin.config.license.title")}
              </h3>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest mt-0.5",
                  isDark ? "text-slate-500" : "text-slate-400",
                )}
              >
                {t("admin.config.quickSettings.fields.licenseStatus")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors",
              isDark
                ? "border-white/15 text-slate-300 hover:bg-white/10"
                : "border-gray-200 text-slate-600 hover:bg-gray-100",
            )}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isDark
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-gray-50 border-gray-100 shadow-sm",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield
                  size={18}
                  className={cn(
                    "shrink-0",
                    isValid ? "text-emerald-500" : "text-rose-500",
                  )}
                />
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("admin.config.quickSettings.fields.licenseStatus")}
                </div>
              </div>
              <div
                className={cn(
                  "text-sm font-black uppercase tracking-tight",
                  isValid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400",
                )}
              >
                {isValid
                  ? t("admin.config.quickSettings.options.licenseAuthorized")
                  : t("admin.config.quickSettings.options.licenseUnauthorized")}
              </div>
              {statusMessage && statusMessage.trim().length > 0 && (
                <div
                  className={cn(
                    "mt-2 text-xs font-bold leading-relaxed",
                    isDark ? "text-slate-400" : "text-slate-600",
                  )}
                >
                  {statusMessage}
                </div>
              )}
            </div>

            <div
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isDark
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-gray-50 border-gray-100 shadow-sm",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-cyan-500 shrink-0" />
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("admin.config.quickSettings.fields.maxUsers")}
                </div>
              </div>
              <div className="text-sm font-black font-mono">
                {currentUsers} / {maxUsers}
              </div>
            </div>

            <div
              className={cn(
                "rounded-xl border p-4 transition-colors",
                isDark
                  ? "bg-white/[0.02] border-white/5"
                  : "bg-gray-50 border-gray-100 shadow-sm",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Key size={18} className="text-amber-500 shrink-0" />
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("admin.config.quickSettings.fields.expiresAt")}
                </div>
              </div>
              <div className="text-sm font-black font-mono">{expiresText}</div>
            </div>

            <div
              className={cn(
                "rounded-xl border p-4 sm:col-span-2 transition-colors",
                isDark
                  ? "bg-black/40 border-white/5"
                  : "bg-zinc-100 border-gray-200 shadow-inner",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint size={18} className="text-purple-500 shrink-0" />
                <div className="text-[10px] font-black uppercase tracking-widest opacity-40">
                  {t("admin.config.quickSettings.fields.hwFingerprint")}
                </div>
              </div>
              <div className="text-xs font-mono break-all select-all font-bold opacity-80">
                {deviceCode || "-"}
              </div>
              {(hwId || auxId) && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2",
                      isDark
                        ? "border-white/10 bg-white/5"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isDark ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      {t("admin.config.license.technical.hwId")}
                    </div>
                    <div
                      className={cn(
                        "text-xs font-mono break-all select-all font-bold mt-1",
                        isDark ? "text-slate-200/80" : "text-slate-800",
                      )}
                    >
                      {hwId || "-"}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg border px-3 py-2",
                      isDark
                        ? "border-white/10 bg-white/5"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isDark ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      {t("admin.config.license.technical.auxId")}
                    </div>
                    <div
                      className={cn(
                        "text-xs font-mono break-all select-all font-bold mt-1",
                        isDark ? "text-slate-200/80" : "text-slate-800",
                      )}
                    >
                      {auxId || "-"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-widest opacity-40 ml-1">
              {t("admin.config.quickSettings.fields.features")}
            </div>
            {featureItems.length === 0 ? (
              <div
                className={cn(
                  "text-sm font-bold italic",
                  isDark ? "text-slate-500" : "text-slate-600",
                )}
              >
                {t("common.none")}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {featureItems.map((f) => (
                  <div
                    key={f.code}
                    className={cn(
                      "rounded-xl border p-3",
                      isDark
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-slate-200 bg-white",
                    )}
                  >
                    <div
                      className={cn(
                        "text-xs font-black uppercase tracking-widest",
                        isDark ? "text-slate-200" : "text-slate-900",
                      )}
                    >
                      {f.title}
                    </div>
                    {f.desc && f.desc.trim().length > 0 && (
                      <div
                        className={cn(
                          "mt-1 text-xs font-bold leading-relaxed",
                          isDark ? "text-slate-400" : "text-slate-600",
                        )}
                      >
                        {f.desc}
                      </div>
                    )}
                    <div
                      className={cn(
                        "mt-2 text-[10px] font-mono font-bold opacity-70",
                        isDark ? "text-slate-400" : "text-slate-500",
                      )}
                    >
                      {f.code}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-widest opacity-40 ml-1 flex items-center gap-2">
              <Key size={14} />
              {t("admin.config.quickSettings.fields.licenseKey")}
            </label>
            <textarea
              className={cn(
                "w-full min-h-[80px] rounded-xl border p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner",
                isDark
                  ? "bg-black/40 border-white/10"
                  : "bg-white border-gray-200",
              )}
              value={licenseKey}
              placeholder={t(
                "admin.config.quickSettings.fields.licenseInputPlaceholder",
              )}
              onChange={(e) => onLicenseKeyChange(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={onApplyLicense}
              disabled={saving || !licenseKey.trim()}
              className="px-8 h-11 rounded-xl shadow-xl shadow-primary/20"
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin mr-2" />
              ) : (
                <Shield size={18} className="mr-2" />
              )}
              {t("admin.config.quickSettings.actions.applyLicense")}
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "border-t px-5 py-4 shrink-0",
            isDark
              ? "border-white/5 bg-black/20 text-slate-500"
              : "border-gray-100 bg-gray-50 text-slate-400",
          )}
        >
          <p className="text-xs font-bold leading-relaxed italic">
            {t("admin.config.quickSettings.fields.licenseHint")}
          </p>
        </div>
      </div>
    </div>
  );
};
