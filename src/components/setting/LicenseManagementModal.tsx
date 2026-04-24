//  License Management Modal
//  Standalone modal for viewing license status and applying license keys.

import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { X, Shield, Fingerprint, Key, Loader2, CheckCircle2, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/common/PasswordInput";
import type {
  ConfigWorkbenchLicenseStatus,
  ConfigWorkbenchLicenseUpdate,
} from "./useConfigWorkbenchController";

export interface LicenseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: ConfigWorkbenchLicenseStatus | null;
  saving: boolean;
  onApplyLicense: (update: ConfigWorkbenchLicenseUpdate) => void;
}

const LicenseItemCard: React.FC<{
  title: string;
  featureKey: string;
  isValid: boolean;
  enabled: boolean;
  msg: string;
  expiresAt?: string | null;
  saving: boolean;
  onApply: (key: string | null, enabled: boolean) => void;
  isDark: boolean;
}> = ({ title, featureKey: _featureKey, isValid, enabled, msg, expiresAt, saving, onApply, isDark }) => {
  const { t, i18n } = useTranslation();
  const [localKey, setLocalKey] = useState("");

  const expiresText = (() => {
    if (!expiresAt) return t("common.none");
    const dt = new Date(expiresAt);
    if (Number.isNaN(dt.getTime())) return expiresAt;
    try {
      return new Intl.DateTimeFormat(i18n.language || undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(dt);
    } catch {
      return dt.toLocaleDateString();
    }
  })();

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-4 transition-all",
      isDark ? "bg-white/[0.02] border-white/5" : "bg-gray-50 border-gray-100 shadow-sm"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={18} className={isValid ? "text-emerald-500" : "text-rose-500"} />
          <h4 className="text-sm font-black tracking-tight">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
            isValid ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isValid ? t("admin.config.quickSettings.options.licenseAuthorized") : t("admin.config.quickSettings.options.licenseUnauthorized")}
          </span>
          <button
            type="button"
            onClick={() => onApply(null, !enabled)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              enabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
            )}
          >
            <span className={cn(
              "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
              enabled ? "translate-x-4" : "translate-x-1"
            )} />
          </button>
        </div>
      </div>

      <p className="text-xs font-bold opacity-60 leading-relaxed">{msg}</p>
      
      {isValid && (
        <div className="flex items-center gap-4 text-[10px] font-black opacity-40 uppercase tracking-widest">
          <div className="flex items-center gap-1">
            <Key size={12} />
            {expiresText}
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-dashed border-white/5">
        <div className="text-[10px] font-black tracking-widest opacity-40 uppercase">{t("admin.config.license.updateKey")}</div>
        <div className="flex gap-2">
          <PasswordInput
            wrapperClassName={cn(
              "flex-1 h-9 rounded-lg border px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
              isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200"
            )}
            placeholder={t("admin.config.license.pasteKey")}
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              onApply(localKey, enabled);
              setLocalKey("");
            }}
            disabled={saving || !localKey.trim()}
            className="h-9 px-4 rounded-lg"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export const LicenseManagementModal: React.FC<LicenseManagementModalProps> = ({
  isOpen,
  onClose,
  status,
  saving,
  onApplyLicense,
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";

  const normalizeLicenseKey = (key: string | null): string | null => {
    if (key === null) {
      return null;
    }
    return key.trim();
  };

  const buildBrandingUpdate = (
    patch: Partial<ConfigWorkbenchLicenseStatus["branding_config"]>,
  ): ConfigWorkbenchLicenseUpdate => ({
    branding: {
      logo_url: patch.logo_url ?? status?.branding_config.logo_url ?? null,
      logo_name: patch.logo_name ?? status?.branding_config.logo_name ?? null,
      footer_text: patch.footer_text ?? status?.branding_config.footer_text ?? null,
    },
  });

  if (!isOpen) return null;

  return (
    <GlassModalShell
      title={(
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("p-2 rounded-lg", isDark ? "bg-amber-500/10" : "bg-amber-50")}>
            <Key size={18} className="text-amber-500 shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="text-sm sm:text-base font-black tracking-widest">{t("admin.config.license.title")}</div>
            <div className="text-[10px] font-bold tracking-widest mt-0.5 opacity-40">{t("admin.config.license.subtitle")}</div>
          </div>
        </div>
      )}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      panelClassName={cn(
        "rounded-2xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden",
        isDark
          ? "bg-slate-950 border-white/10 text-slate-100 ring-1 ring-white/5"
          : "bg-white border-gray-200 text-slate-900"
      )}
      bodyClassName="p-4 sm:p-6 space-y-6"
      overlayClassName={cn(
        "backdrop-blur-2xl transition-all duration-300",
        isDark ? "bg-black/95" : "bg-slate-900/80"
      )}
      zIndexClassName="z-[150]"
      containerClassName="p-2 sm:p-4"
      closeButton={(
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors",
            isDark ? "border-white/15 text-slate-300 hover:bg-white/10" : "border-gray-200 text-slate-600 hover:bg-gray-100"
          )}
        >
          <X size={16} />
        </button>
      )}
      footer={(
        <div className={cn(
          "w-full text-xs font-bold leading-relaxed italic",
          isDark ? "text-slate-500" : "text-slate-400"
        )}>
          {t("admin.config.license.hint")}
        </div>
      )}
    >
      {/* Hardware Fingerprint Section */}
      <div className={cn(
        "rounded-xl border p-4 transition-colors",
        isDark ? "bg-black/40 border-white/5" : "bg-zinc-100 border-gray-200 shadow-inner",
      )}>
            <div className="flex items-center gap-2 mb-2">
              <Fingerprint size={18} className="text-purple-500 shrink-0" />
              <div className="text-[10px] font-black tracking-widest opacity-40 uppercase">
                {t("admin.config.license.technical.hwId")} / {t("admin.config.license.technical.auxId")}
              </div>
            </div>
            <div className="text-xs font-mono break-all select-all font-bold opacity-80">
              {status?.device_code || "-"}
            </div>
          </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration License */}
            <LicenseItemCard
              title={t("admin.config.license.features.registration")}
              featureKey="registration"
              isValid={status?.registration.is_valid ?? false}
              enabled={status?.registration.enabled ?? false}
              msg={status?.registration.msg ?? t("admin.config.license.noStatus")}
              expiresAt={status?.registration.expires_at ?? null}
              saving={saving}
              isDark={isDark}
              onApply={(key, enabled) =>
                onApplyLicense({
                  registration: { key: normalizeLicenseKey(key), enabled },
                })
              }
            />

            {/* Branding License */}
            <LicenseItemCard
              title={t("admin.config.license.features.branding")}
              featureKey="branding"
              isValid={status?.branding.is_valid ?? false}
              enabled={status?.branding.enabled ?? false}
              msg={status?.branding.msg ?? t("admin.config.license.noStatus")}
              expiresAt={status?.branding.expires_at ?? null}
              saving={saving}
              isDark={isDark}
              onApply={(key, enabled) =>
                onApplyLicense({
                  branding_license: { key: normalizeLicenseKey(key), enabled },
                })
              }
            />

            {/* Storage Encryption License */}
            <LicenseItemCard
              title={t("admin.config.license.features.storageEncryption")}
              featureKey="storage_encryption"
              isValid={status?.storage_encryption.is_valid ?? false}
              enabled={status?.storage_encryption.enabled ?? false}
              msg={status?.storage_encryption.msg ?? t("admin.config.license.noStatus")}
              expiresAt={status?.storage_encryption.expires_at ?? null}
              saving={saving}
              isDark={isDark}
              onApply={(key, enabled) =>
                onApplyLicense({
                  storage_encryption: { key: normalizeLicenseKey(key), enabled },
                })
              }
            />

            {/* Branding Details Config (Only if authorized) */}
            {status?.branding.is_valid && status.branding.enabled && (
              <div className={cn(
                "rounded-xl border p-4 space-y-4 transition-all md:col-span-2",
                isDark ? "bg-primary/5 border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.05)]" : "bg-blue-50/50 border-blue-100 shadow-sm"
              )}>
                <div className="flex items-center gap-2">
                  <WandSparkles size={18} className="text-primary" />
                  <h4 className="text-sm font-black tracking-tight">{t("admin.config.license.brandingDetails")}</h4>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="branding-logo-url" className="text-[10px] font-black tracking-widest opacity-40 uppercase ml-1">{t("admin.config.license.logoUrl")}</label>
                    <input
                      id="branding-logo-url"
                      type="text"
                      className={cn(
                        "w-full h-9 rounded-lg border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                        isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200"
                      )}
                      placeholder={t("admin.config.license.placeholders.logoUrl")}
                      defaultValue={status.branding_config?.logo_url || ""}
                      onBlur={(e) =>
                        onApplyLicense(buildBrandingUpdate({ logo_url: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="branding-logo-name" className="text-[10px] font-black tracking-widest opacity-40 uppercase ml-1">{t("admin.config.license.logoName")}</label>
                    <input
                      id="branding-logo-name"
                      type="text"
                      className={cn(
                        "w-full h-9 rounded-lg border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                        isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200"
                      )}
                      placeholder={t("admin.config.license.placeholders.logoName")}
                      defaultValue={status.branding_config?.logo_name || ""}
                      onBlur={(e) =>
                        onApplyLicense(buildBrandingUpdate({ logo_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="branding-footer-text" className="text-[10px] font-black tracking-widest opacity-40 uppercase ml-1">{t("admin.config.license.footerText")}</label>
                    <input
                      id="branding-footer-text"
                      type="text"
                      className={cn(
                        "w-full h-9 rounded-lg border px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all",
                        isDark ? "bg-black/40 border-white/10" : "bg-white border-gray-200"
                      )}
                      placeholder={t("admin.config.license.placeholders.footerText")}
                      defaultValue={status.branding_config?.footer_text || ""}
                      onBlur={(e) =>
                        onApplyLicense(buildBrandingUpdate({ footer_text: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
    </GlassModalShell>
  );
};
