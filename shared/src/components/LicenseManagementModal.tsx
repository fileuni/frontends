//  License Management Modal / 授权管理模态框
//  Standalone modal for viewing license status and applying license keys.
//  独立模态框，用于查看授权状态并应用授权码。

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, Users, Fingerprint, Key, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export interface LicenseManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Whether the current license is valid / 当前授权是否有效 */
  isValid: boolean;
  /** Current number of users / 当前用户数 */
  currentUsers: number;
  /** Maximum allowed users / 最大用户配额 */
  maxUsers: number;
  /** Device code (hardware fingerprint) / 设备代码（硬件指纹） */
  deviceCode: string;
  /** Current license key input value / 当前授权码输入值 */
  licenseKey: string;
  /** Whether the license is being saved / 是否正在保存授权 */
  saving: boolean;
  /** Callback when license key changes / 授权码变更回调 */
  onLicenseKeyChange: (value: string) => void;
  /** Callback when applying license / 应用授权回调 */
  onApplyLicense: () => void;
  /** Optional: license expiration date / 可选：授权到期时间 */
  expiresAt?: string | null;
  /** Optional: list of enabled features / 可选：已启用功能列表 */
  features?: string[];
}

export const LicenseManagementModal: React.FC<LicenseManagementModalProps> = ({
  isOpen,
  onClose,
  isValid,
  currentUsers,
  maxUsers,
  deviceCode,
  licenseKey,
  saving,
  onLicenseKeyChange,
  onApplyLicense,
  expiresAt,
  features,
}) => {
  const { t } = useTranslation();

  // Handle ESC key to close modal / 处理 ESC 键关闭模态框
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="license-modal-title"
    >
      {/* Backdrop / 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content / 模态框内容 */}
      <div className="relative w-full max-w-lg max-h-[90vh] rounded-2xl border border-white/10 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden">
        {/* Header / 头部 */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2 min-w-0">
            <Key size={18} className="text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3
                id="license-modal-title"
                className="text-sm sm:text-base font-black uppercase tracking-wide truncate"
              >
                {t('admin.config.quickWizard.steps.license')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                {t('admin.config.quickWizard.fields.licenseStatus')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-white/15 text-slate-300 hover:bg-white/10 inline-flex items-center justify-center transition-colors"
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body / 主体内容 */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Status Cards / 状态卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Authorization Status / 授权状态 */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} className={cn(
                  'shrink-0',
                  isValid ? 'text-emerald-400' : 'text-red-400'
                )} />
                <div className="text-[11px] uppercase opacity-60">
                  {t('admin.config.quickWizard.fields.licenseStatus')}
                </div>
              </div>
              <div className={cn(
                'text-sm font-bold',
                isValid ? 'text-emerald-300' : 'text-red-300'
              )}>
                {isValid
                  ? t('admin.config.quickWizard.options.licenseAuthorized')
                  : t('admin.config.quickWizard.options.licenseUnauthorized')}
              </div>
            </div>

            {/* User Quota / 用户配额 */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-cyan-400 shrink-0" />
                <div className="text-[11px] uppercase opacity-60">
                  {t('admin.config.quickWizard.fields.maxUsers')}
                </div>
              </div>
              <div className="text-sm font-bold">
                {currentUsers} / {maxUsers}
              </div>
            </div>

            {/* Hardware Fingerprint / 硬件指纹 */}
            <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint size={14} className="text-purple-400 shrink-0" />
                <div className="text-[11px] uppercase opacity-60">
                  {t('admin.config.quickWizard.fields.hwFingerprint')}
                </div>
              </div>
              <div className="text-xs sm:text-sm font-mono break-all select-all">
                {deviceCode || '-'}
              </div>
            </div>

            {/* Expiration Date (if provided) / 到期时间（如果提供） */}
            {expiresAt && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:col-span-2">
                <div className="text-[11px] uppercase opacity-60 mb-1">
                  {t('admin.config.quickWizard.fields.expiresAt') || 'Expires At'}
                </div>
                <div className="text-sm font-bold">
                  {expiresAt}
                </div>
              </div>
            )}

            {/* Enabled Features (if provided) / 已启用功能（如果提供） */}
            {features && features.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:col-span-2">
                <div className="text-[11px] uppercase opacity-60 mb-2">
                  {t('admin.config.quickWizard.fields.features') || 'Enabled Features'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {features.map((feature) => (
                    <span
                      key={feature}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* License Key Input / 授权码输入 */}
          <div className="space-y-2">
            <label className="text-xs font-semibold flex items-center gap-1.5">
              <Key size={12} />
              {t('admin.config.quickWizard.fields.licenseKey')}
            </label>
            <input
              type="text"
              className="w-full h-10 rounded-lg border border-white/15 bg-black/30 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              value={licenseKey}
              placeholder={t('admin.config.quickWizard.fields.licenseInputPlaceholder')}
              onChange={(e) => onLicenseKeyChange(e.target.value)}
              disabled={saving}
            />
          </div>

          {/* Apply Button / 应用按钮 */}
          <div className="flex justify-end">
            <button
              type="button"
              className={cn(
                'h-9 px-4 rounded-lg border text-xs sm:text-sm font-bold transition-colors inline-flex items-center gap-2',
                saving || licenseKey.trim().length === 0
                  ? 'border-white/10 bg-white/5 text-slate-500 cursor-not-allowed'
                  : 'border-primary bg-primary text-primary-foreground hover:opacity-90'
              )}
              onClick={onApplyLicense}
              disabled={saving || licenseKey.trim().length === 0}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t('admin.config.quickWizard.actions.applyLicense')}
            </button>
          </div>
        </div>

        {/* Footer Hint / 底部提示 */}
        <div className="border-t border-white/10 px-4 py-2.5 sm:px-5 bg-black/20">
          <p className="text-[10px] sm:text-xs text-slate-500">
            {t('admin.config.quickWizard.licenseHint') ||
              'Get your license key from the official website. The device code is used for hardware binding.'}
          </p>
        </div>
      </div>
    </div>
  );
};
