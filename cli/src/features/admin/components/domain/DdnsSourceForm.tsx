import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Network, Globe, Terminal, ShieldCheck, Database, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface DdnsSourceFormProps {
  label: string;
  sourceJson: string;
  onChange: (json: string) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

type SourceType = 'static' | 'url' | 'interface' | 'command' | 'inherit_last';

interface SourceConfig {
  type: SourceType;
  value?: string;
  url?: string;
  name?: string; // interface name
  cmd?: string;
}

// High-visibility control base
const controlBase = "h-11 rounded-xl border border-zinc-400/60 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm font-bold text-foreground placeholder:opacity-30";
const selectBase = cn(controlBase, "appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] pl-9");
const selectStyle = { backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")' };

export const DdnsSourceForm: React.FC<DdnsSourceFormProps> = ({
  label,
  sourceJson,
  onChange,
  enabled,
  onToggle,
}) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<SourceConfig>({ type: 'url', url: 'https://api64.ipify.org' });
  const [mode, setMode] = useState<'form' | 'raw'>('form');

  useEffect(() => {
    try {
      const parsed = JSON.parse(sourceJson || '{}');
      if (Object.keys(parsed).length > 0) setConfig(parsed);
    } catch {
      setMode('raw');
    }
  }, [sourceJson]);

  const updateConfig = (newConfig: SourceConfig) => {
    setConfig(newConfig);
    onChange(JSON.stringify(newConfig));
  };

  const handleTypeChange = (type: SourceType) => {
    const newConfig: SourceConfig = { type };
    if (type === 'url') newConfig.url = 'https://api.ipify.org';
    if (type === 'static') newConfig.value = '127.0.0.1';
    if (type === 'interface') newConfig.name = 'eth0';
    if (type === 'command') newConfig.cmd = 'ip addr show';
    updateConfig(newConfig);
  };

  const getIcon = (type: SourceType) => {
    switch (type) {
      case 'url': return <Globe size={14} />;
      case 'interface': return <Network size={14} />;
      case 'static': return <ShieldCheck size={14} />;
      case 'command': return <Terminal size={14} />;
      case 'inherit_last': return <Database size={14} />;
    }
  };

  return (
    <div className={cn(
      "p-5 rounded-2xl border transition-all duration-300 shadow-none",
      enabled ? "bg-white dark:bg-white/[0.03] border-zinc-200 dark:border-white/10" : "bg-gray-100/30 dark:bg-white/[0.01] border-gray-200 dark:border-white/5 opacity-50 shadow-inner"
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            enabled ? "bg-primary/10 dark:bg-primary/20 text-primary border-primary/20 shadow-sm" : "bg-gray-200/50 dark:bg-white/5 text-gray-400 dark:text-white/20 border-gray-300 dark:border-white/5"
          )}>
            <Network size={16} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80 leading-none mb-1">{label}</h4>
            <p className="text-[10px] opacity-60 dark:opacity-40 font-bold uppercase tracking-tighter leading-none text-foreground/60 dark:text-foreground/40">Detection Source Configuration</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {enabled && (
             <button
              type="button"
              className="text-[10px] font-black uppercase tracking-widest text-primary underline underline-offset-4 opacity-60 hover:opacity-100 transition-all flex items-center gap-1"
              onClick={() => setMode(mode === 'form' ? 'raw' : 'form')}
            >
              <Settings2 size={12} />
              {mode === 'form' ? 'Raw JSON' : 'Visual'}
            </button>
           )}
           <Switch checked={enabled} onChange={onToggle} />
        </div>
      </div>

      {enabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          {mode === 'raw' ? (
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-zinc-400/60 dark:border-white/5 bg-gray-50 dark:bg-black/20 px-4 py-3 font-mono text-xs text-foreground dark:text-white/80 outline-none focus:border-primary/30 transition-all shadow-inner"
              value={sourceJson}
              onChange={(e) => onChange(e.target.value)}
              spellCheck={false}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4 items-center">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">{t('admin.domain.detectionSource')}</label>
                <div className="relative text-foreground">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40 dark:text-white/40 pointer-events-none">
                    {getIcon(config.type)}
                  </div>
                  <select
                    className={selectBase}
                    style={selectStyle}
                    value={config.type || 'url'}
                    onChange={(e) => handleTypeChange(e.target.value as SourceType)}
                  >
                    <option value="url">URL (HTTP API)</option>
                    <option value="interface">Interface</option>
                    <option value="static">Static IP</option>
                    <option value="command">Shell Command</option>
                    <option value="inherit_last">Inherit Last</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-foreground/40 ml-1">
                  {config.type === 'url' ? t('admin.domain.endpointUrl') : 
                   config.type === 'interface' ? t('admin.domain.interfaceName') :
                   config.type === 'static' ? t('admin.domain.fixedAddress') :
                   config.type === 'command' ? t('admin.domain.bashCommand') : 'Configuration'}
                </label>
                
                {config.type === 'url' && (
                  <Input
                    placeholder="https://api.ipify.org"
                    value={config.url || ''}
                    onChange={(e) => updateConfig({ ...config, url: e.target.value })}
                    className={controlBase}
                  />
                )}

                {config.type === 'interface' && (
                  <Input
                    placeholder="eth0 or wlan0"
                    value={config.name || ''}
                    onChange={(e) => updateConfig({ ...config, name: e.target.value })}
                    className={cn(controlBase, "font-mono")}
                  />
                )}

                {config.type === 'static' && (
                  <Input
                    placeholder="1.2.3.4"
                    value={config.value || ''}
                    onChange={(e) => updateConfig({ ...config, value: e.target.value })}
                    className={cn(controlBase, "font-mono")}
                  />
                )}

                {config.type === 'command' && (
                  <div className="space-y-2">
                    <Input
                      placeholder="curl -s https://api.ipify.org"
                      value={config.cmd || ''}
                      onChange={(e) => updateConfig({ ...config, cmd: e.target.value })}
                      className={cn(controlBase, "font-mono")}
                    />
                    <p className="text-[10px] opacity-50 dark:opacity-30 font-bold uppercase tracking-tighter text-foreground/60">Requires system-level execution permission.</p>
                  </div>
                )}

                {config.type === 'inherit_last' && (
                  <div className="h-11 flex items-center px-4 rounded-xl bg-gray-100 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-[10px] font-black uppercase tracking-widest opacity-40 dark:opacity-30 italic text-foreground">
                    Uses the last successfully detected IP address
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
