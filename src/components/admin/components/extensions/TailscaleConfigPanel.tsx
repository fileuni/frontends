import { Copy, Network, Play, Save, Server, Shield, Square, Waves } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';
import { AdminCard } from '../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { Switch } from '@/components/ui/Switch.tsx';
import type { TailscaleRuntimeConfig } from './types.ts';

type Props = {
  config: TailscaleRuntimeConfig;
  loading: boolean;
  onChange: (patch: Partial<TailscaleRuntimeConfig>) => void;
  onSave: () => Promise<void>;
  onCopyDaemonCommand: () => void;
  onCopyUpCommand: () => void;
  onRunUp: () => Promise<void>;
  onRunDown: () => Promise<void>;
  onRunStatus: () => Promise<void>;
  onRunNetcheck: () => Promise<void>;
};

const choiceClass = (active: boolean): string => (
  active
    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
    : 'bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10'
);

export const TailscaleConfigPanel = ({
  config,
  loading,
  onChange,
  onSave,
  onCopyDaemonCommand,
  onCopyUpCommand,
  onRunUp,
  onRunDown,
  onRunStatus,
  onRunNetcheck,
}: Props) => {
  const { t } = useTranslation();

  return (
    <AdminCard variant="glass" className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className="rounded-[1.5rem] border border-primary/15 bg-primary/5 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 text-primary">
            <Server size={20} />
            <div className="text-lg font-black tracking-tight">{t('admin.extensions.tailscale.daemonTitle')}</div>
          </div>
          <p className="text-sm sm:text-base leading-7 opacity-75">{t('admin.extensions.tailscale.daemonHint')}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 text-white/85">
            <Shield size={20} />
            <div className="text-lg font-black tracking-tight">{t('admin.extensions.tailscale.loginTitle')}</div>
          </div>
          <p className="text-sm sm:text-base leading-7 opacity-75">{t('admin.extensions.tailscale.loginHint')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.stateDirLabel')}</div>
          <Input value={config.state_dir} onChange={(e) => onChange({ state_dir: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.stateFileLabel')}</div>
          <Input value={config.state_file} onChange={(e) => onChange({ state_file: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.socketPathLabel')}</div>
          <Input value={config.socket_path} onChange={(e) => onChange({ socket_path: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-3">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.tunModeLabel')}</div>
          <div className="flex flex-wrap gap-2">
            {['userspace-networking', 'tailscale0'].map((value) => (
              <Button key={value} size="sm" variant={config.tun_mode === value ? 'primary' : 'ghost'} className={`rounded-xl px-4 py-2 text-xs sm:text-sm ${choiceClass(config.tun_mode === value)}`} onClick={() => onChange({ tun_mode: value })}>
                {value}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.udpPortLabel')}</div>
          <Input value={String(config.udp_port)} onChange={(e) => onChange({ udp_port: Number(e.target.value || 0) })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.verboseLabel')}</div>
          <Input value={String(config.verbose)} onChange={(e) => onChange({ verbose: Number(e.target.value || 0) })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.debugAddrLabel')}</div>
          <Input value={config.debug_addr} onChange={(e) => onChange({ debug_addr: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.socks5Label')}</div>
          <Input value={config.socks5_server} onChange={(e) => onChange({ socks5_server: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.httpProxyLabel')}</div>
          <Input value={config.http_proxy_listen} onChange={(e) => onChange({ http_proxy_listen: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.loginServerLabel')}</div>
          <Input value={config.login_server} onChange={(e) => onChange({ login_server: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="space-y-2 xl:col-span-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.authKeyLabel')}</div>
          <PasswordInput value={config.auth_key} onChange={(e) => onChange({ auth_key: e.target.value })} inputClassName="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" placeholder="tskey-auth-..." />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.hostnameLabel')}</div>
          <Input value={config.hostname} onChange={(e) => onChange({ hostname: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.operatorLabel')}</div>
          <Input value={config.operator} onChange={(e) => onChange({ operator: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.acceptDnsLabel')}</div>
          </div>
          <Switch checked={config.accept_dns} onChange={(value) => onChange({ accept_dns: value })} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.acceptRoutesLabel')}</div>
          </div>
          <Switch checked={config.accept_routes} onChange={(value) => onChange({ accept_routes: value })} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.sshLabel')}</div>
          </div>
          <Switch checked={config.ssh} onChange={(value) => onChange({ ssh: value })} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.shieldsUpLabel')}</div>
          </div>
          <Switch checked={config.shields_up} onChange={(value) => onChange({ shields_up: value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.noLogsLabel')}</div>
          </div>
          <Switch checked={config.no_logs_no_support} onChange={(value) => onChange({ no_logs_no_support: value })} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.advertiseExitNodeLabel')}</div>
          </div>
          <Switch checked={config.advertise_exit_node} onChange={(value) => onChange({ advertise_exit_node: value })} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.advertiseRoutesLabel')}</div>
          <Input value={config.advertise_routes} onChange={(e) => onChange({ advertise_routes: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" placeholder="10.0.0.0/24,192.168.0.0/24" />
        </div>
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.advertiseTagsLabel')}</div>
          <Input value={config.advertise_tags} onChange={(e) => onChange({ advertise_tags: e.target.value })} className="h-12 rounded-2xl bg-white/5 border border-white/10 font-mono" placeholder="tag:server,tag:edge" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.daemonCommandLabel')}</div>
            <Button size="sm" variant="ghost" className="rounded-xl bg-white/5 border border-white/10 px-4" onClick={onCopyDaemonCommand}>
              <Copy size={14} className="mr-2" />
              {t('admin.extensions.tailscale.copyDaemonCommand')}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{config.daemon_command || '--'}</pre>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-45">{t('admin.extensions.tailscale.upCommandLabel')}</div>
            <Button size="sm" variant="ghost" className="rounded-xl bg-white/5 border border-white/10 px-4" onClick={onCopyUpCommand}>
              <Copy size={14} className="mr-2" />
              {t('admin.extensions.tailscale.copyUpCommand')}
            </Button>
          </div>
          <pre className="whitespace-pre-wrap break-all font-mono text-xs sm:text-sm leading-7 opacity-85">{config.up_command || '--'}</pre>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[450px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <Button variant="primary" className="h-12 sm:h-14 rounded-2xl uppercase tracking-widest" onClick={onRunUp} disabled={loading}>
          <Play size={16} className="mr-2" />
          {t('admin.extensions.tailscale.runUp')}
        </Button>
        <Button variant="ghost" className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 uppercase tracking-widest" onClick={onRunDown} disabled={loading}>
          <Square size={16} className="mr-2" />
          {t('admin.extensions.tailscale.runDown')}
        </Button>
        <Button variant="ghost" className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 uppercase tracking-widest" onClick={onRunStatus} disabled={loading}>
          <Network size={16} className="mr-2" />
          {t('admin.extensions.tailscale.runStatus')}
        </Button>
        <Button variant="ghost" className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 uppercase tracking-widest" onClick={onRunNetcheck} disabled={loading}>
          <Waves size={16} className="mr-2" />
          {t('admin.extensions.tailscale.runNetcheck')}
        </Button>
      </div>

      <div className="flex justify-end">
        <Button variant="primary" className="h-12 sm:h-14 rounded-2xl px-8 uppercase tracking-widest" onClick={onSave} disabled={loading}>
          <Save size={16} className="mr-2" />
          {t('admin.extensions.tailscale.saveConfig')}
        </Button>
      </div>
    </AdminCard>
  );
};
