import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { useToastStore } from '@/stores/toast';
import { Input } from '@/components/ui/Input.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { Pagination } from '@/components/ui/Pagination';
import { AdminCard, AdminPage, AdminPageHeader } from './admin-ui';
import { 
  ClipboardList, Search,
  RefreshCw, Calendar, User,
  Activity, AlertCircle
} from 'lucide-react';
import { client, extractData, type PaginatedData } from '@/lib/api.ts';

// Journal log entry type - matches yh_journal_log entity
interface JournalLogEntry {
  id: string | number;
  user_id: string;
  journal_type: string;
  action: string;
  src_info: string;
  dst_info?: string | null;
  status: string;
  error?: string | null;
  created_at: string;
}

export const AuditLogAdmin = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<JournalLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  // Filters
  const [userIdFilter, setUserIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await extractData<PaginatedData<JournalLogEntry>>(
        client.GET('/api/v1/admin/journal/logs', {
          params: {
            query: {
              page,
              page_size: pageSize,
              ...(userIdFilter ? { user_id: userIdFilter } : {}),
              ...(typeFilter ? { journal_type: typeFilter } : {}),
              ...(actionFilter ? { action: actionFilter } : {}),
              ...(statusFilter ? { status: statusFilter } : {}),
            },
          },
        }),
      );

      setLogs(res.items);
      setTotal(res.total ?? res.pagination?.total ?? res.items.length);
    } catch (e) { 
      console.error(e);
      addToast(t('admin.audit.fetchError') || 'Failed to fetch audit logs', 'error');
    }
    finally { setLoading(false); }
  }, [page, pageSize, userIdFilter, typeFilter, actionFilter, statusFilter, addToast, t]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    void fetchLogs();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 whitespace-nowrap">{t('admin.audit.statusSuccess')}</Badge>;
      case 'FAIL':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 whitespace-nowrap">{t('admin.audit.statusFail')}</Badge>;
      case 'START':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 whitespace-nowrap">{t('admin.audit.statusStart')}</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'FILE':
        return <Badge className="bg-sky-500/10 text-sky-500 border-sky-500/20">{t('admin.audit.typeFile')}</Badge>;
      case 'USER':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">{t('admin.audit.typeUser')}</Badge>;
      case 'SYSTEM':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">{t('admin.audit.typeSystem')}</Badge>;
      case 'SECURITY':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">{t('admin.audit.typeSecurity')}</Badge>;
      case 'FINANCIAL':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{t('admin.audit.typeFinancial')}</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        icon={<ClipboardList size={24} />}
        title={t('admin.audit.title') || 'Audit Logs'}
        subtitle={
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
            <p className="text-sm font-bold opacity-40 tracking-widest truncate">
              {t('admin.audit.eventsTotal', { count: total })}
            </p>
          </div>
        }
        actions={
          <form onSubmit={handleSearch} className="flex w-full flex-wrap items-stretch gap-3 xl:w-auto xl:justify-end">
            <div className="relative min-w-0 flex-1 group sm:min-w-[150px] xl:flex-none">
               <User className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary transition-all" size={18} />
               <Input 
                 value={userIdFilter} 
                 onChange={e => setUserIdFilter(e.target.value)} 
                 placeholder={t('admin.audit.userIdPlaceholder')} 
                 className="pl-9 h-10 text-sm"
               />
             </div>
            <div className="relative min-w-0 flex-1 group sm:min-w-[120px] xl:flex-none">
               <Activity className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:text-primary transition-all" size={18} />
               <Input 
                 value={actionFilter} 
                 onChange={e => setActionFilter(e.target.value)} 
                 placeholder={t('admin.audit.actionPlaceholder')} 
                  className="pl-9 h-10 text-sm"
               />
             </div>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/5 bg-white/5 px-3 text-sm outline-none transition-all focus:border-primary/50 sm:min-w-[150px] xl:flex-none"
            >
              <option value="">{t('admin.audit.allTypes')}</option>
              <option value="FILE">{t('admin.audit.typeFile')}</option>
              <option value="USER">{t('admin.audit.typeUser')}</option>
              <option value="SYSTEM">{t('admin.audit.typeSystem')}</option>
              <option value="SECURITY">{t('admin.audit.typeSecurity')}</option>
              <option value="FINANCIAL">{t('admin.audit.typeFinancial')}</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/5 bg-white/5 px-3 text-sm outline-none transition-all focus:border-primary/50 sm:min-w-[150px] xl:flex-none"
            >
              <option value="">{t('admin.audit.allStatus')}</option>
              <option value="SUCCESS">{t('admin.audit.statusSuccess')}</option>
              <option value="FAIL">{t('admin.audit.statusFail')}</option>
              <option value="START">{t('admin.audit.statusStart')}</option>
            </select>
            <button type="submit" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition-all shadow-lg shadow-primary/20 hover:opacity-90 sm:flex-none">
              <Search size={18} />
              {t('common.search') || 'Search'}
            </button>
            <button type="button" onClick={() => {
               setUserIdFilter('');
               setActionFilter('');
               setTypeFilter('');
               setStatusFilter('');
            }} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-4 text-sm font-bold transition-all hover:bg-white/10 sm:w-10 sm:px-0">
              <RefreshCw size={18} />
            </button>
          </form>
        }
      />

      <AdminCard variant="glass" className="rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="divide-y divide-white/5 md:hidden">
          {loading ? (
            <div className="px-5 py-16 text-center">
              <div className="flex flex-col items-center gap-4 opacity-30">
                <RefreshCw className="animate-spin" size={32} />
                <p className="text-sm font-black tracking-widest">{t('admin.loading') || 'Loading...'}</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="flex flex-col items-center gap-4 opacity-30">
                <ClipboardList size={32} />
                <p className="text-sm font-black tracking-widest">{t('admin.audit.noLogsFound')}</p>
              </div>
            </div>
          ) : (
            logs.map((log) => (
              <article key={log.id} className="space-y-3 px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(log.status)}
                  {getTypeBadge(log.journal_type)}
                </div>
                <div className="space-y-1">
                  <div className="font-black break-words">{log.action}</div>
                  <div className="flex items-center gap-2 text-xs opacity-60 break-all">
                    <Calendar size={14} className="shrink-0" />
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs opacity-60 break-all">{log.user_id}</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3 space-y-2">
                  <div className="text-xs break-all">
                    <span className="mr-2 font-black opacity-40">Src</span>
                    <span className="opacity-80">{log.src_info}</span>
                  </div>
                  {log.dst_info && (
                    <div className="text-xs break-all">
                      <span className="mr-2 font-black opacity-40">Dst</span>
                      <span className="opacity-80">{log.dst_info}</span>
                    </div>
                  )}
                  {log.error && (
                    <div className="flex items-start gap-2 text-xs text-red-400 break-all">
                      <AlertCircle size={14} className="mt-0.5 shrink-0" />
                      <span>{log.error}</span>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[960px] w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-sm font-black tracking-widest opacity-30 w-48">{t('admin.audit.table.time')}</th>
                <th className="px-6 py-4 text-sm font-black tracking-widest opacity-30 w-40">{t('admin.audit.table.user')}</th>
                <th className="px-6 py-4 text-sm font-black tracking-widest opacity-30 w-32">{t('admin.audit.table.type')}</th>
                <th className="px-6 py-4 text-sm font-black tracking-widest opacity-30 w-48">{t('admin.audit.table.action')}</th>
                <th className="px-6 py-4 text-sm font-black tracking-widest opacity-30 w-64">{t('admin.audit.table.details')}</th>
                <th className="px-6 py-4 text-sm font-black tracking-widest opacity-30 w-32">{t('admin.audit.table.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <RefreshCw className="animate-spin" size={32} />
                      <p className="text-sm font-black tracking-widest">{t('admin.loading') || 'Loading...'}</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <ClipboardList size={32} />
                      <p className="text-sm font-black tracking-widest">{t('admin.audit.noLogsFound')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-mono opacity-50">
                        <Calendar size={18} className="shrink-0" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center border border-white/5 font-black text-sm shrink-0">
                          {log.user_id[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-bold truncate max-w-[120px]" title={log.user_id}>{log.user_id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(log.journal_type)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black tracking-tight truncate" title={log.action}>{log.action}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm opacity-60 truncate" title={log.src_info}>
                          <span className="font-bold mr-1 opacity-40">Src:</span>
                          {log.src_info}
                        </div>
                        {log.dst_info && (
                          <div className="text-sm opacity-60 truncate" title={log.dst_info}>
                            <span className="font-bold mr-1 opacity-40">Dst:</span>
                            {log.dst_info}
                          </div>
                        )}
                        {log.error && (
                          <div className="text-sm text-red-400 truncate flex items-center gap-1" title={log.error}>
                            <AlertCircle size={10} className="shrink-0" />
                            {log.error}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(log.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          current={page}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          className="bg-background/50 backdrop-blur-md"
        />
      </AdminCard>
    </AdminPage>
  );
};
