import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PasswordInput } from "@/components/common/PasswordInput";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import {
  ensureRecord,
  isRecord,
  type ConfigObject,
} from "@/lib/configObject";
import type { TomlAdapter } from "./ExternalDependencyConfigModal";
import { useConfigDraftBinding } from "./useConfigDraftBinding";

type Draft = {
  enableEmailAuth: boolean;
  enableMobileAuth: boolean;
  emailEnabled: boolean;
  emailFromName: string;
  emailFromAddress: string;
  emailReplyToAddress: string;
  emailSubjectPrefix: string;
  emailSmtpHost: string;
  emailSmtpPort: string;
  emailSmtpSecurity: "ssl_tls" | "starttls" | "none";
  emailSmtpUsername: string;
  emailSmtpPassword: string;
  emailTimeoutSecs: string;
  smsEnabled: boolean;
  smsWebhookUrl: string;
  smsTimeoutSecs: string;
  smsEnableAuthHeader: boolean;
  smsAuthHeaderName: string;
  smsAuthHeaderValue: string;
  smsEnableSignature: boolean;
  smsSignatureHeader: string;
  smsSignatureSecret: string;
};

type Props = {
  tomlAdapter: TomlAdapter;
  content: string;
  onContentChange: (value: string) => void;
};

const defaultDraft: Draft = {
  enableEmailAuth: false,
  enableMobileAuth: false,
  emailEnabled: false,
  emailFromName: "FileUni",
  emailFromAddress: "no-reply@example.com",
  emailReplyToAddress: "support@example.com",
  emailSubjectPrefix: "[FileUni]",
  emailSmtpHost: "smtp.example.com",
  emailSmtpPort: "465",
  emailSmtpSecurity: "ssl_tls",
  emailSmtpUsername: "no-reply@example.com",
  emailSmtpPassword: "CHANGE_ME_SMTP_PASSWORD",
  emailTimeoutSecs: "15",
  smsEnabled: false,
  smsWebhookUrl: "https://example.com/fileuni/sms",
  smsTimeoutSecs: "10",
  smsEnableAuthHeader: false,
  smsAuthHeaderName: "Authorization",
  smsAuthHeaderValue: "Bearer CHANGE_ME_WEBHOOK_TOKEN",
  smsEnableSignature: false,
  smsSignatureHeader: "X-FileUni-Signature",
  smsSignatureSecret: "CHANGE_ME_WEBHOOK_SECRET",
};

const asRecord = (value: unknown): ConfigObject => {
  return isRecord(value) ? value : {};
};

const toStringValue = (value: unknown, fallback: string): string => {
  return typeof value === "string" ? value : fallback;
};

const toBooleanValue = (value: unknown, fallback: boolean): boolean => {
  return typeof value === "boolean" ? value : fallback;
};

const toNumberString = (value: unknown, fallback: string): string => {
  return typeof value === "number" ? String(value) : fallback;
};

const parseDraft = (source: string, tomlAdapter: TomlAdapter): Draft => {
  const parsed = tomlAdapter.parse(source);
  const root = asRecord(parsed);
  const userCenter = asRecord(root["user_center"]);
  const outbound = asRecord(root["outbound_pusher"]);
  const email = asRecord(outbound["email"]);
  const smsWebhook = asRecord(outbound["sms_webhook"]);

  const emailSecurityRaw = toStringValue(
    email["smtp_security"],
    defaultDraft.emailSmtpSecurity,
  ).toLowerCase();
  const emailSmtpSecurity: Draft["emailSmtpSecurity"] =
    emailSecurityRaw === "starttls"
      ? "starttls"
      : emailSecurityRaw === "none"
        ? "none"
        : "ssl_tls";

  return {
    enableEmailAuth: toBooleanValue(
      userCenter["enable_email_auth"],
      defaultDraft.enableEmailAuth,
    ),
    enableMobileAuth: toBooleanValue(
      userCenter["enable_mobile_auth"],
      defaultDraft.enableMobileAuth,
    ),
    emailEnabled: toBooleanValue(email["enabled"], defaultDraft.emailEnabled),
    emailFromName: toStringValue(email["from_name"], defaultDraft.emailFromName),
    emailFromAddress: toStringValue(
      email["from_address"],
      defaultDraft.emailFromAddress,
    ),
    emailReplyToAddress: toStringValue(
      email["reply_to_address"],
      defaultDraft.emailReplyToAddress,
    ),
    emailSubjectPrefix: toStringValue(
      email["subject_prefix"],
      defaultDraft.emailSubjectPrefix,
    ),
    emailSmtpHost: toStringValue(email["smtp_host"], defaultDraft.emailSmtpHost),
    emailSmtpPort: toNumberString(email["smtp_port"], defaultDraft.emailSmtpPort),
    emailSmtpSecurity,
    emailSmtpUsername: toStringValue(
      email["smtp_username"],
      defaultDraft.emailSmtpUsername,
    ),
    emailSmtpPassword: toStringValue(
      email["smtp_password"],
      defaultDraft.emailSmtpPassword,
    ),
    emailTimeoutSecs: toNumberString(
      email["connect_timeout_secs"],
      defaultDraft.emailTimeoutSecs,
    ),
    smsEnabled: toBooleanValue(smsWebhook["enabled"], defaultDraft.smsEnabled),
    smsWebhookUrl: toStringValue(smsWebhook["url"], defaultDraft.smsWebhookUrl),
    smsTimeoutSecs: toNumberString(
      smsWebhook["connect_timeout_secs"],
      defaultDraft.smsTimeoutSecs,
    ),
    smsEnableAuthHeader: toBooleanValue(
      smsWebhook["enable_auth_header"],
      defaultDraft.smsEnableAuthHeader,
    ),
    smsAuthHeaderName: toStringValue(
      smsWebhook["auth_header_name"],
      defaultDraft.smsAuthHeaderName,
    ),
    smsAuthHeaderValue: toStringValue(
      smsWebhook["auth_header_value"],
      defaultDraft.smsAuthHeaderValue,
    ),
    smsEnableSignature: toBooleanValue(
      smsWebhook["enable_signature"],
      defaultDraft.smsEnableSignature,
    ),
    smsSignatureHeader: toStringValue(
      smsWebhook["signature_header"],
      defaultDraft.smsSignatureHeader,
    ),
    smsSignatureSecret: toStringValue(
      smsWebhook["signature_secret"],
      defaultDraft.smsSignatureSecret,
    ),
  };
};

const applyDraft = (
  source: string,
  tomlAdapter: TomlAdapter,
  draft: Draft,
): string => {
  const parsed = tomlAdapter.parse(source);
  const root = asRecord(parsed);
  const userCenter = ensureRecord(root, "user_center");
  const outbound = ensureRecord(root, "outbound_pusher");
  const email = ensureRecord(outbound, "email");
  const smsWebhook = ensureRecord(outbound, "sms_webhook");

  userCenter["enable_email_auth"] = draft.enableEmailAuth;
  userCenter["enable_mobile_auth"] = draft.enableMobileAuth;

  email["enabled"] = draft.emailEnabled;
  email["from_name"] = draft.emailFromName;
  email["from_address"] = draft.emailFromAddress;
  email["reply_to_address"] = draft.emailReplyToAddress;
  email["subject_prefix"] = draft.emailSubjectPrefix;
  email["smtp_host"] = draft.emailSmtpHost;
  email["smtp_port"] = Number.parseInt(draft.emailSmtpPort, 10) || 465;
  email["smtp_security"] = draft.emailSmtpSecurity;
  email["smtp_username"] = draft.emailSmtpUsername;
  email["smtp_password"] = draft.emailSmtpPassword;
  email["connect_timeout_secs"] = Number.parseInt(draft.emailTimeoutSecs, 10) || 15;

  smsWebhook["enabled"] = draft.smsEnabled;
  smsWebhook["url"] = draft.smsWebhookUrl;
  smsWebhook["connect_timeout_secs"] = Number.parseInt(draft.smsTimeoutSecs, 10) || 10;
  smsWebhook["enable_auth_header"] = draft.smsEnableAuthHeader;
  smsWebhook["auth_header_name"] = draft.smsAuthHeaderName;
  smsWebhook["auth_header_value"] = draft.smsAuthHeaderValue;
  smsWebhook["enable_signature"] = draft.smsEnableSignature;
  smsWebhook["signature_header"] = draft.smsSignatureHeader;
  smsWebhook["signature_secret"] = draft.smsSignatureSecret;

  return tomlAdapter.stringify(root);
};

const Section: React.FC<{
  title: string;
  hint?: string;
  isDark: boolean;
  children: React.ReactNode;
}> = ({ title, hint, isDark, children }) => {
  return (
    <section
      className={cn(
        "rounded-2xl border p-4 space-y-4",
        isDark ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-white",
      )}
    >
      <div>
        <div
          className={cn(
            "text-xs font-black tracking-wide",
            isDark ? "text-slate-400" : "text-slate-700",
          )}
        >
          {title}
        </div>
        {hint ? (
          <div
            className={cn(
              "mt-2 text-sm leading-6",
              isDark ? "text-slate-400" : "text-slate-600",
            )}
          >
            {hint}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
};

const Label: React.FC<{ text: string; isDark: boolean }> = ({ text, isDark }) => {
  return (
    <div
      className={cn(
        "text-xs font-black tracking-wide",
        isDark ? "text-slate-400" : "text-slate-700",
      )}
    >
      {text}
    </div>
  );
};

export const IdentityVerificationInlinePanel: React.FC<Props> = ({
  tomlAdapter,
  content,
  onContentChange,
}) => {
  const { t } = useTranslation();
  const isDark = useResolvedTheme() === "dark";

  const createDraft = useCallback(
    (source: string) => parseDraft(source, tomlAdapter),
    [tomlAdapter],
  );
  const buildContent = useCallback(
    (source: string, draft: Draft) => applyDraft(source, tomlAdapter, draft),
    [tomlAdapter],
  );
  const { draft, setDraft } = useConfigDraftBinding<Draft>({
    content,
    onContentChange,
    createDraft,
    buildContent,
  });

  const inputClass = cn(
    "mt-2 h-11 w-full rounded-xl border px-3 text-sm font-mono",
    isDark
      ? "border-white/10 bg-black/30 text-white"
      : "border-slate-300 bg-white text-slate-900",
  );

  return (
    <div className="space-y-4">
      <Section
        title={t("admin.config.identityVerification.authTitle")}
        hint={t("admin.config.identityVerification.authHint")}
        isDark={isDark}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <input
              type="checkbox"
              checked={draft.enableEmailAuth}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  enableEmailAuth: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
              {t("admin.config.identityVerification.enableEmailAuth")}
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
            <input
              type="checkbox"
              checked={draft.enableMobileAuth}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  enableMobileAuth: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
              {t("admin.config.identityVerification.enableMobileAuth")}
            </span>
          </label>
        </div>
      </Section>

      <Section
        title={t("admin.config.identityVerification.emailTitle")}
        hint={t("admin.config.identityVerification.emailHint")}
        isDark={isDark}
      >
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={draft.emailEnabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, emailEnabled: event.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
            {t("admin.config.identityVerification.emailEnabled")}
          </span>
        </label>
        <div className="grid gap-4 xl:grid-cols-2">
          <div>
            <Label text={t("admin.config.identityVerification.emailFromName")} isDark={isDark} />
            <input value={draft.emailFromName} onChange={(event) => setDraft((prev) => ({ ...prev, emailFromName: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailFromAddress")} isDark={isDark} />
            <input value={draft.emailFromAddress} onChange={(event) => setDraft((prev) => ({ ...prev, emailFromAddress: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailReplyToAddress")} isDark={isDark} />
            <input value={draft.emailReplyToAddress} onChange={(event) => setDraft((prev) => ({ ...prev, emailReplyToAddress: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailSubjectPrefix")} isDark={isDark} />
            <input value={draft.emailSubjectPrefix} onChange={(event) => setDraft((prev) => ({ ...prev, emailSubjectPrefix: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailSmtpHost")} isDark={isDark} />
            <input value={draft.emailSmtpHost} onChange={(event) => setDraft((prev) => ({ ...prev, emailSmtpHost: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailSmtpPort")} isDark={isDark} />
            <input value={draft.emailSmtpPort} onChange={(event) => setDraft((prev) => ({ ...prev, emailSmtpPort: event.target.value }))} className={inputClass} inputMode="numeric" />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailSmtpSecurity")} isDark={isDark} />
            <select value={draft.emailSmtpSecurity} onChange={(event) => setDraft((prev) => ({ ...prev, emailSmtpSecurity: event.target.value as Draft["emailSmtpSecurity"] }))} className={inputClass}>
              <option value="ssl_tls">{t("admin.config.identityVerification.securitySslTls")}</option>
              <option value="starttls">{t("admin.config.identityVerification.securityStartTls")}</option>
              <option value="none">{t("admin.config.identityVerification.securityNone")}</option>
            </select>
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailTimeoutSecs")} isDark={isDark} />
            <input value={draft.emailTimeoutSecs} onChange={(event) => setDraft((prev) => ({ ...prev, emailTimeoutSecs: event.target.value }))} className={inputClass} inputMode="numeric" />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailSmtpUsername")} isDark={isDark} />
            <input value={draft.emailSmtpUsername} onChange={(event) => setDraft((prev) => ({ ...prev, emailSmtpUsername: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.emailSmtpPassword")} isDark={isDark} />
            <PasswordInput value={draft.emailSmtpPassword} onChange={(event) => setDraft((prev) => ({ ...prev, emailSmtpPassword: event.target.value }))} inputClassName={inputClass} />
          </div>
        </div>
      </Section>

      <Section
        title={t("admin.config.identityVerification.smsTitle")}
        hint={t("admin.config.identityVerification.smsHint")}
        isDark={isDark}
      >
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={draft.smsEnabled}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, smsEnabled: event.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
            {t("admin.config.identityVerification.smsEnabled")}
          </span>
        </label>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="xl:col-span-2">
            <Label text={t("admin.config.identityVerification.smsWebhookUrl")} isDark={isDark} />
            <input value={draft.smsWebhookUrl} onChange={(event) => setDraft((prev) => ({ ...prev, smsWebhookUrl: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.smsTimeoutSecs")} isDark={isDark} />
            <input value={draft.smsTimeoutSecs} onChange={(event) => setDraft((prev) => ({ ...prev, smsTimeoutSecs: event.target.value }))} className={inputClass} inputMode="numeric" />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
          <label className="flex items-center gap-3 xl:col-span-2">
            <input
              type="checkbox"
              checked={draft.smsEnableAuthHeader}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, smsEnableAuthHeader: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
              {t("admin.config.identityVerification.smsEnableAuthHeader")}
            </span>
          </label>
          <div>
            <Label text={t("admin.config.identityVerification.smsAuthHeaderName")} isDark={isDark} />
            <input value={draft.smsAuthHeaderName} onChange={(event) => setDraft((prev) => ({ ...prev, smsAuthHeaderName: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.smsAuthHeaderValue")} isDark={isDark} />
            <PasswordInput value={draft.smsAuthHeaderValue} onChange={(event) => setDraft((prev) => ({ ...prev, smsAuthHeaderValue: event.target.value }))} inputClassName={inputClass} />
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2 rounded-xl border border-dashed border-slate-300/70 p-3 dark:border-white/10">
          <label className="flex items-center gap-3 xl:col-span-2">
            <input
              type="checkbox"
              checked={draft.smsEnableSignature}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, smsEnableSignature: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className={cn("text-sm font-bold", isDark ? "text-slate-200" : "text-slate-700")}>
              {t("admin.config.identityVerification.smsEnableSignature")}
            </span>
          </label>
          <div>
            <Label text={t("admin.config.identityVerification.smsSignatureHeader")} isDark={isDark} />
            <input value={draft.smsSignatureHeader} onChange={(event) => setDraft((prev) => ({ ...prev, smsSignatureHeader: event.target.value }))} className={inputClass} />
          </div>
          <div>
            <Label text={t("admin.config.identityVerification.smsSignatureSecret")} isDark={isDark} />
            <PasswordInput value={draft.smsSignatureSecret} onChange={(event) => setDraft((prev) => ({ ...prev, smsSignatureSecret: event.target.value }))} inputClassName={inputClass} />
          </div>
        </div>
        <div
          className={cn(
            "rounded-xl border p-3 text-sm leading-6",
            isDark
              ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-100"
              : "border-cyan-200 bg-cyan-50 text-cyan-900",
          )}
        >
          {t("admin.config.identityVerification.smsPayloadHint")}
        </div>
      </Section>
    </div>
  );
};
