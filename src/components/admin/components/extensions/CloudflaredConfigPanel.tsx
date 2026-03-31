import { Cloud, Copy, KeyRound, Rocket, Save, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import { AdminCard } from '../admin-ui';
import type { CloudflaredServiceConfig } from './types.ts';

type Props = {
  config: CloudflaredServiceConfig;
  loading: boolean;
  onChange: (patch: Partial<CloudflaredServiceConfig>) => void;
  onSave: () => Promise<void>;
  onCopyServiceCommand: () => void;
  onCopyQuickTunnelCommand: () => void;
};

const choiceClass = (active: boolean): string => (
  active
    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
    : 'bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10'
);

const ReadOnlyPathCard = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
    <div className="text-xs font-black uppercase tracking-widest opacity-45">{label}</div>
    <div className="mt-2 break-all font-mono text-sm sm:text-base opacity-85">{value || '--'}</div>
  </div>
);

export const CloudflaredConfigPanel = ({
  config,
  loading,
  onChange,
  onSave,
  onCopyServiceCommand,
  onCopyQuickTunnelCommand,
}: Props) => {
  const { t } = useTranslation();

  return (
    <AdminCard variant="glass" className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl space-y-6 sm:space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-[1.5rem] border border-primary/15 bg-primary/5 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <Shield size={20} />
            <div className="text-lg font-black tracking-tight">{t('admin.extensions.cloudflared.runtimeConfigTitle')}</div>
          </div>
          <p className="text-sm sm:text-base leading-7 opacity-75">
            {t('admin.extensions.cloudflared.runtimeConfigHint')}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 text-white/85">
            <Rocket size={20} />
            <div className="text-lg font-black tracking-tight">{t('admin.extensions.cloudflared.quickTunnelTitle')}</div>
          </div>
          <p className="text-sm sm:text-base leading-7 opacity-75">
            {t('admin.extensions.cloudflared.quickTunnelHint')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45 flex items-center gap-2">
              <KeyRound size={14} />
              {t('admin.extensions.cloudflared.tokenLabel')}
            </div>
            <PasswordInput
              value={config.tunnel_token}
              onChange={(e) => onChange({ tunnel_token: e.target.value })}
              placeholder={t('admin.extensions.cloudflared.tokenPlaceholder')}
              inputClassName="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 px-4 font-mono text-sm sm:text-base"
            />
            <p className="text-xs sm:text-sm leading-6 opacity-60">
              {t('admin.extensions.cloudflared.tokenHint')}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
              {t('admin.extensions.cloudflared.logLevelLabel')}
            </div>
            <div className="flex flex-wrap gap-2">
              {['debug', 'info', 'warn', 'error', 'fatal'].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={config.log_level === value ? 'primary' : 'ghost'}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm uppercase tracking-widest ${choiceClass(config.log_level === value)}`}
                  onClick={() => onChange({ log_level: value })}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
              {t('admin.extensions.cloudflared.protocolLabel')}
            </div>
            <div className="flex flex-wrap gap-2">
              {['auto', 'http2', 'quic'].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={config.protocol === value ? 'primary' : 'ghost'}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm uppercase tracking-widest ${choiceClass(config.protocol === value)}`}
                  onClick={() => onChange({ protocol: value })}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
              {t('admin.extensions.cloudflared.edgeIpVersionLabel')}
            </div>
            <div className="flex flex-wrap gap-2">
              {['auto', '4', '6'].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={config.edge_ip_version === value ? 'primary' : 'ghost'}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm uppercase tracking-widest ${choiceClass(config.edge_ip_version === value)}`}
                  onClick={() => onChange({ edge_ip_version: value })}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
              {t('admin.extensions.cloudflared.metricsLabel')}
            </div>
            <Input
              value={config.metrics}
              onChange={(e) => onChange({ metrics: e.target.value })}
              placeholder="127.0.0.1:49312"
              className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 px-4 font-mono text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
              {t('admin.extensions.cloudflared.logFileLabel')}
            </div>
            <Input
              value={config.log_file}
              onChange={(e) => onChange({ log_file: e.target.value })}
              placeholder="/var/log/cloudflared.log"
              className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 px-4 font-mono text-sm sm:text-base"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
                {t('admin.extensions.cloudflared.noAutoupdateLabel')}
              </div>
              <p className="text-xs sm:text-sm leading-6 opacity-60">
                {t('admin.extensions.cloudflared.noAutoupdateHint')}
              </p>
            </div>
            <Switch
              checked={config.no_autoupdate}
              onChange={(value) => onChange({ no_autoupdate: value })}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45 flex items-center gap-2">
              <Cloud size={14} />
              {t('admin.extensions.cloudflared.quickTunnelUrlLabel')}
            </div>
            <Input
              value={config.quick_tunnel_url}
              onChange={(e) => onChange({ quick_tunnel_url: e.target.value })}
              placeholder="http://127.0.0.1:8080"
              className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 px-4 font-mono text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <ReadOnlyPathCard label={t('admin.extensions.cloudflared.stateDirLabel')} value={config.state_dir} />
        <ReadOnlyPathCard label={t('admin.extensions.cloudflared.stateFileLabel')} value={config.state_file_path} />
        <ReadOnlyPathCard label={t('admin.extensions.cloudflared.tokenFileLabel')} value={config.token_file_path} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
                {t('admin.extensions.cloudflared.serviceCommandLabel')}
              </div>
              <p className="mt-1 text-xs sm:text-sm opacity-60 leading-6">
                {t('admin.extensions.cloudflared.serviceCommandHint')}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl bg-white/5 border border-white/10 px-4"
              onClick={onCopyServiceCommand}
            >
              <Copy size={14} className="mr-2" />
              {t('admin.extensions.cloudflared.copyServiceCommand')}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{config.service_command || '--'}</pre>
        </div>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
                {t('admin.extensions.cloudflared.quickTunnelCommandLabel')}
              </div>
              <p className="mt-1 text-xs sm:text-sm opacity-60 leading-6">
                {t('admin.extensions.cloudflared.quickTunnelCommandHint')}
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl bg-white/5 border border-white/10 px-4"
              onClick={onCopyQuickTunnelCommand}
            >
              <Copy size={14} className="mr-2" />
              {t('admin.extensions.cloudflared.copyQuickTunnelCommand')}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{config.quick_tunnel_command || '--'}</pre>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5 space-y-3">
        <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">
          {t('admin.extensions.cloudflared.dashboardGuideTitle')}
        </div>
        <p className="text-sm sm:text-base leading-7 opacity-75">
          {t('admin.extensions.cloudflared.dashboardGuideBody')}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button
          variant="primary"
          className="flex-1 h-12 sm:h-14 rounded-2xl text-sm sm:text-base tracking-widest uppercase"
          onClick={onSave}
          disabled={loading}
        >
          <Save size={16} className="mr-2" />
          {t('admin.extensions.cloudflared.saveConfig')}
        </Button>
        <Button
          variant="ghost"
          className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 px-6"
          onClick={onCopyServiceCommand}
        >
          <Copy size={16} className="mr-2" />
          {t('admin.extensions.cloudflared.copyServiceCommand')}
        </Button>
      </div>
    </AdminCard>
  );
};
