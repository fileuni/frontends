import { Activity, CheckCircle2, RefreshCw, Terminal, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AdminCard } from '../admin-ui';
import { Button } from '@/components/ui/Button.tsx';
import type { ToolDiagnosticResult } from './types.ts';

type Props = {
  results: ToolDiagnosticResult[];
  loading: boolean;
  onRefresh: () => void;
};

export const ToolDiagnosticsPanel = ({ results, loading, onRefresh }: Props) => {
  const { t } = useTranslation();

  return (
    <AdminCard variant="glass" className="rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 shadow-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight">{t('admin.extensions.diagnosticsTitle')}</div>
            <p className="text-sm opacity-65">{t('admin.extensions.diagnosticsHint')}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl bg-white/5 border border-white/10"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {results.length === 0 ? (
          <div className="py-10 text-center opacity-40 text-sm italic">
            {t('admin.extensions.noDiagnostics')}
          </div>
        ) : (
          results.map((res) => (
            <div key={res.key} className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {res.code === 0 ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <XCircle size={16} className="text-red-400" />
                    )}
                    <span className="font-black text-sm sm:text-base">{res.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] opacity-40">
                    <Terminal size={10} />
                    {res.command}
                  </div>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${res.code === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {res.code === 0 ? 'Pass' : 'Error'}
                </div>
              </div>

              {res.stdout || res.stderr ? (
                <div className="space-y-2">
                  {res.stdout ? (
                    <pre className="p-3 rounded-xl bg-black/30 text-[12px] font-mono whitespace-pre-wrap break-all opacity-80 leading-relaxed border border-white/5">
                      {res.stdout}
                    </pre>
                  ) : null}
                  {res.stderr ? (
                    <pre className="p-3 rounded-xl bg-red-500/5 text-red-300/80 text-[12px] font-mono whitespace-pre-wrap break-all leading-relaxed border border-red-500/10">
                      {res.stderr}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </AdminCard>
  );
};
