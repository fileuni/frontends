import type { LucideIcon } from 'lucide-react';
import { CheckCircle, RefreshCw, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

// Global styles for high-visibility controls in light mode
export const controlBase =
  'h-11 rounded-xl border border-zinc-400/60 dark:border-white/10 bg-white dark:bg-white/5 px-3 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all shadow-sm font-bold text-foreground placeholder:opacity-30';

export const selectBase = cn(
  controlBase,
  'appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] font-normal',
);

export const selectStyle = {
  backgroundImage:
    'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")',
} as const;

export const sectionCardBase =
  'p-5 sm:p-8 rounded-3xl sm:rounded-[2.5rem] bg-zinc-50/50 dark:bg-white/[0.02] border border-zinc-200 dark:border-white/5 dark:shadow-2xl transition-all';

export const normalizeStatus = (
  value?: string | null,
): 'idle' | 'running' | 'success' | 'failed' => {
  const input = (value || '').toLowerCase().trim();
  if (input.includes('skipped_running')) return 'running';
  if (input.includes('run') || input.includes('processing')) return 'running';
  if (input.includes('fail') || input.includes('error')) return 'failed';
  if (input.includes('success') || input.includes('ok')) return 'success';
  return 'idle';
};

export const StatusBadge = ({ status }: { status?: string | null | undefined }) => {
  const { t } = useTranslation();
  const s = normalizeStatus(status);
  if (s === 'success') {
    return (
      <Badge
        variant="outline"
        className="bg-green-500/10 text-green-700 dark:text-green-500 border-green-500/20 whitespace-nowrap font-bold"
      >
        <CheckCircle size={18} className="mr-1" /> {t('admin.domain.statusSuccess')}
      </Badge>
    );
  }
  if (s === 'failed') {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/10 text-red-700 dark:text-red-500 border-red-500/20 whitespace-nowrap font-bold"
      >
        <XCircle size={18} className="mr-1" /> {t('admin.domain.statusFailed')}
      </Badge>
    );
  }
  if (s === 'running') {
    return (
      <Badge
        variant="outline"
        className="bg-blue-500/10 text-blue-700 dark:text-blue-500 border-blue-500/20 whitespace-nowrap animate-pulse font-bold"
      >
        <RefreshCw size={18} className="mr-1 animate-spin" />
        {t('admin.domain.statusRunning')}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="whitespace-nowrap opacity-50 dark:opacity-40 font-bold"
    >
      {t('admin.domain.statusIdle')}
    </Badge>
  );
};

export const SectionHeader = ({
  icon: Icon,
  title,
  desc,
  colorClass = 'bg-primary/10 text-primary border-primary/20',
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  colorClass?: string;
}) => (
  <div className="flex items-start gap-3 mb-6">
    <div
      className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center border shrink-0',
        colorClass,
      )}
    >
      <Icon size={16} />
    </div>
    <div>
      <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80 leading-none mb-1">
        {title}
      </h4>
      {desc && (
        <p className="text-[14px] opacity-60 dark:opacity-40 font-bold uppercase tracking-tighter leading-none text-foreground/60 dark:text-foreground/40">
          {desc}
        </p>
      )}
    </div>
  </div>
);
