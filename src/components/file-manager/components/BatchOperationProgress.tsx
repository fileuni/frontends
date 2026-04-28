import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { Badge } from '@/components/ui/Badge.tsx';
import { toast } from '@/stores/toast';
import { client, BASE_URL, extractData } from '@/lib/api.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { Activity, FileJson, X } from 'lucide-react';

// Batch task progress modal: poll task status by task_id.

type TaskStatusValue = 'queued' | 'pending' | 'running' | 'success' | 'failed' | 'interrupted';

type TaskSseUpdateEvent = {
  id: string;
  progress?: number;
  status?: TaskStatusValue;
  message?: string | null;
  updated_at?: string;
};

type SseFrame = {
  event: string;
  data: string;
};

const getTaskStatusLabel = (
  t: ReturnType<typeof useTranslation>['t'],
  status: TaskStatusValue,
): string => {
  switch (status) {
    case 'queued':
      return t('filemanager.batch.status_queued');
    case 'pending':
      return t('filemanager.batch.status_pending');
    case 'running':
      return t('filemanager.batch.status_running');
    case 'success':
      return t('filemanager.batch.status_success');
    case 'failed':
      return t('filemanager.batch.status_failed');
    case 'interrupted':
      return t('filemanager.batch.status_interrupted');
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isTaskStatusValue = (value: unknown): value is TaskStatusValue => {
  return (
    value === 'queued' ||
    value === 'pending' ||
    value === 'running' ||
    value === 'success' ||
    value === 'failed' ||
    value === 'interrupted'
  );
};

const isTaskStatus = (value: unknown): value is TaskStatus => {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    isTaskStatusValue(value['status']) &&
    typeof value['progress'] === 'number' &&
    Number.isFinite(value['progress']) &&
    typeof value['created_at'] === 'string' &&
    typeof value['updated_at'] === 'string'
  );
};

const isTaskSseUpdateEvent = (value: unknown): value is TaskSseUpdateEvent => {
  if (!isRecord(value)) return false;
  if (typeof value['id'] !== 'string') return false;
  if (value['progress'] !== undefined && (typeof value['progress'] !== 'number' || !Number.isFinite(value['progress']))) {
    return false;
  }
  if (value['status'] !== undefined && !isTaskStatusValue(value['status'])) return false;
  if (value['message'] !== undefined && value['message'] !== null && typeof value['message'] !== 'string') return false;
  if (value['updated_at'] !== undefined && typeof value['updated_at'] !== 'string') return false;
  return true;
};

const readSseStream = async (
  response: Response,
  signal: AbortSignal,
  onFrame: (frame: SseFrame) => void,
): Promise<void> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('SSE stream is not readable in this environment');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';
  let dataLines: string[] = [];

  const flushFrame = () => {
    const data = dataLines.join('\n');
    if (data.length > 0 || currentEvent.length > 0) {
      onFrame({ event: currentEvent, data });
    }
    currentEvent = '';
    dataLines = [];
  };

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) {
      flushFrame();
      return;
    }

    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line === '') {
        flushFrame();
        continue;
      }
      if (line.startsWith(':')) {
        // Comment / keep-alive.
        continue;
      }
      if (line.startsWith('event:')) {
        currentEvent = line.slice('event:'.length).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim());
        continue;
      }
    }
  }
};

type ApiResp<T> = {
  success: boolean;
  code: number;
  biz_code?: string | null;
  msg?: string;
  data: T;
  req_id?: string;
  cip?: string;
};

interface TaskStatus {
  id: string;
  status: TaskStatusValue;
  progress: number;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

interface BatchStatistics {
  total: number;
  success: number;
  failed: number;
  pending: number;
  skipped: number;
  total_size: number;
  total_time_ms: number;
  failed_items: Array<{
    file_path: string;
    error_message: string;
  }>;
}

export function BatchOperationProgress({
  isOpen,
  taskId,
  onClose,
  onFinished,
}: {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  onFinished?: (status: TaskStatusValue) => void;
}) {
  const { t } = useTranslation();
  const finishedOnceRef = useRef(false);
  const taskStatusRef = useRef<TaskStatus | null>(null);

  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null);
  const [statistics, setStatistics] = useState<BatchStatistics | null>(null);
  const [showFailedDetails, setShowFailedDetails] = useState(false);
  const [showJsonReport, setShowJsonReport] = useState(false);
  const [jsonReportData, setJsonReportData] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !taskId) return undefined;

    finishedOnceRef.current = false;
    taskStatusRef.current = null;
    setTaskStatus(null);
    setStatistics(null);
    setShowFailedDetails(false);
    setShowJsonReport(false);
    setJsonReportData('');
    setLoading(true);

    const abortController = new AbortController();

    let pollingIntervalId: ReturnType<typeof setInterval> | null = null;
    let statsIntervalId: ReturnType<typeof setInterval> | null = null;

    const isTerminal = (status: TaskStatusValue) => {
      return status === 'success' || status === 'failed' || status === 'interrupted';
    };

    const finishOnce = (status: TaskStatusValue) => {
      if (!finishedOnceRef.current) {
        finishedOnceRef.current = true;
        onFinished?.(status);
      }
    };

    const applySnapshot = (task: TaskStatus) => {
      taskStatusRef.current = task;
      setTaskStatus(task);
      setLoading(false);
      if (isTerminal(task.status)) {
        if (statsIntervalId) {
          clearInterval(statsIntervalId);
          statsIntervalId = null;
        }
        finishOnce(task.status);
      }
    };

    const applyUpdate = (update: TaskSseUpdateEvent) => {
      const prev = taskStatusRef.current;
      if (!prev) return;
      const next: TaskStatus = {
        ...prev,
        ...(typeof update.progress === 'number' ? { progress: update.progress } : {}),
        ...(update.status ? { status: update.status } : {}),
        ...(update.message !== undefined ? { message: update.message } : {}),
        ...(typeof update.updated_at === 'string' ? { updated_at: update.updated_at } : {}),
      };
      taskStatusRef.current = next;
      setTaskStatus(next);
      if (isTerminal(next.status)) {
        if (statsIntervalId) {
          clearInterval(statsIntervalId);
          statsIntervalId = null;
        }
        finishOnce(next.status);
      }
    };

    const fetchStatistics = async () => {
      if (!taskId) return;
      const current = taskStatusRef.current;
      if (!current) return;
      if (current.status !== 'running' && current.status !== 'success' && current.status !== 'failed') {
        return;
      }

      try {
        const stats = await extractData<BatchStatistics>(client.GET(
          '/api/v1/file/task/{id}/statistics',
          { params: { path: { id: taskId } } },
        ));
        setStatistics(stats);
      } catch (error) {
        console.error('Error fetching task statistics:', error);
      }
    };

    const startStatisticsPolling = () => {
      if (statsIntervalId) return;
      void fetchStatistics();
      statsIntervalId = setInterval(fetchStatistics, 2000);
    };

    const stopPollingTimers = () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
      if (statsIntervalId) {
        clearInterval(statsIntervalId);
        statsIntervalId = null;
      }
    };

    const startPollingFallback = () => {
      if (pollingIntervalId) return;

      const fetchStatus = async () => {
        try {
          const task = await extractData<TaskStatus>(client.GET(
            '/api/v1/file/task/{id}',
            { params: { path: { id: taskId } } },
          ));
          applySnapshot(task);

          if (task.status === 'running' || task.status === 'success' || task.status === 'failed') {
            await fetchStatistics();
          }

          if (isTerminal(task.status)) {
            stopPollingTimers();
          }
        } catch (error) {
          console.error('Error fetching task status:', error);
        } finally {
          setLoading(false);
        }
      };

      void fetchStatus();
      pollingIntervalId = setInterval(fetchStatus, 2000);
    };

    const startSse = async () => {
      let receivedSnapshot = false;
      let reachedTerminal = false;

      try {
        const { currentUserData } = useAuthStore.getState();
        const headers: Record<string, string> = {
          'Accept': 'text/event-stream',
        };
        if (currentUserData?.access_token) {
          headers['Authorization'] = `Bearer ${currentUserData.access_token}`;
        }

        const response = await fetch(
          `${BASE_URL}/api/v1/file/task/${taskId}/events`,
          { headers, signal: abortController.signal },
        );
        if (!response.ok) {
          throw new Error(`SSE request failed: ${response.status}`);
        }

        await readSseStream(response, abortController.signal, (frame) => {
          if (abortController.signal.aborted) return;
          if (frame.event === 'snapshot') {
            const parsed = JSON.parse(frame.data) as unknown;
            if (isTaskStatus(parsed)) {
              receivedSnapshot = true;
              const terminal = isTerminal(parsed.status);
              applySnapshot(parsed);
              reachedTerminal = terminal;
              if (terminal) {
                void fetchStatistics();
              } else {
                startStatisticsPolling();
              }
            }
            return;
          }
          if (frame.event === 'update') {
            const parsed = JSON.parse(frame.data) as unknown;
            if (isTaskSseUpdateEvent(parsed)) {
              applyUpdate(parsed);
              const current = taskStatusRef.current;
              if (current && isTerminal(current.status)) {
                reachedTerminal = true;
                if (current.status === 'success' || current.status === 'failed') {
                  void fetchStatistics();
                }
              }
            }
            return;
          }
          if (frame.event === 'resync') {
            // Server indicates the SSE receiver lagged; refresh snapshot once.
            void (async () => {
              try {
                const task = await extractData<TaskStatus>(client.GET(
                  '/api/v1/file/task/{id}',
                  { params: { path: { id: taskId } } },
                ));
                applySnapshot(task);
              } catch {
                // Ignore resync failures; polling fallback may recover.
              }
            })();
          }
        });

        if (!abortController.signal.aborted) {
          const current = taskStatusRef.current;
          reachedTerminal = reachedTerminal || (current ? isTerminal(current.status) : false);
          if (!reachedTerminal) {
            throw new Error('SSE stream ended before task finished');
          }
        }
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.warn('SSE stream failed, falling back to polling:', error);

        // If SSE fails mid-task, ensure we don’t double-poll statistics.
        if (statsIntervalId) {
          clearInterval(statsIntervalId);
          statsIntervalId = null;
        }

        // If we never received the snapshot, ensure the UI can recover.
        if (!receivedSnapshot) {
          setLoading(true);
        }
        startPollingFallback();
      }
    };

    void startSse();

    return () => {
      abortController.abort();
      stopPollingTimers();
    };
  }, [isOpen, taskId, onFinished]);

  const handleViewJsonReport = async () => {
    if (!taskId) return;

    try {
      const { currentUserData } = useAuthStore.getState();
      const headers: Record<string, string> = {};
      if (currentUserData?.access_token) {
        headers['Authorization'] = `Bearer ${currentUserData.access_token}`;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/file/task/${taskId}/export`,
        { headers },
      );
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const text = await response.text();
      setJsonReportData(text);
      setShowJsonReport(true);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error(t('filemanager.batch.exportFailed'));
    }
  };

  const handleContinue = async () => {
    if (!taskId) return;

    try {
      const { currentUserData } = useAuthStore.getState();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUserData?.access_token) {
        headers['Authorization'] = `Bearer ${currentUserData.access_token}`;
      }

      const response = await fetch(
        `${BASE_URL}/api/v1/file/task/${taskId}/continue`,
        {
          method: 'POST',
          headers,
        },
      );

      if (!response.ok) {
        const errJson = (await response
          .json()
          .catch(() => ({ msg: 'Request failed' }))) as { msg?: string };
        throw new Error(errJson['msg'] || 'Request failed');
      }

      const res = (await response.json()) as ApiResp<{ retry_count: number }>;
      const retryCount = res['data']?.['retry_count'] || 0;

      toast.success(t('filemanager.batch.continueStarted', { count: retryCount }));

      // Refresh task status
      window.location.reload();
    } catch (error) {
      console.error('Error continuing operation:', error);
      toast.error(
        error instanceof Error ? error.message : t('filemanager.batch.continueFailed'),
      );
    }
  };

  const handleDownloadJson = () => {
    if (!jsonReportData || !taskId) return;

    const blob = new Blob([jsonReportData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_report_${taskId}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast.success(t('filemanager.batch.reportExported'));
  };

  const getStatusColor = (status: TaskStatusValue) => {
    switch (status) {
      case 'queued':
        return 'bg-slate-500';
      case 'success':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-500';
      case 'interrupted':
        return 'bg-orange-500';
      default:
        return 'bg-slate-500';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  if (!isOpen || !taskId) return null;

  return (
    <>
      <GlassModalShell
        title={t('filemanager.batch.operationProgress')}
        subtitle={taskStatus ? getTaskStatusLabel(t, taskStatus.status) : t('common.loading')}
        icon={<Activity size={24} />}
        onClose={onClose}
        compact="all"
        maxWidthClassName="max-w-2xl"
        closeButton={(
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
            <X size={24} className="opacity-40" />
          </Button>
        )}
      >
        {loading ? (
          <div className="p-2">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {taskStatus && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {t('filemanager.batch.status')}
                  </span>
                  <Badge className={getStatusColor(taskStatus.status)}>
                    {getTaskStatusLabel(t, taskStatus.status)}
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('filemanager.batch.progress')}</span>
                    <span>{taskStatus.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${getStatusColor(
                        taskStatus.status,
                      )}`}
                      style={{ width: `${taskStatus.progress}%` }}
                    ></div>
                  </div>
                </div>

                {taskStatus.message && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {taskStatus.message}
                  </p>
                )}
              </div>
            )}

            {statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {statistics.success}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('filemanager.batch.success')}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {statistics.failed}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('filemanager.batch.failed')}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                    {statistics.total}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('filemanager.batch.total')}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatBytes(statistics.total_size)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t('filemanager.batch.totalSize')}
                  </div>
                </div>
              </div>
            )}

            {statistics && statistics.failed > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">
                    {t('filemanager.batch.failedItems')}
                  </h3>
                  <Button
                    variant="outline"
                    onClick={() => setShowFailedDetails(!showFailedDetails)}
                    className="rounded-xl px-4 py-2 text-sm"
                  >
                    {showFailedDetails
                      ? t('filemanager.batch.hideDetails')
                      : t('filemanager.batch.showDetails')}
                  </Button>
                </div>

                {showFailedDetails && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {statistics.failed_items.map((item) => (
                      <div
                        key={`${item.file_path}-${item.error_message}`}
                        className="bg-red-50 dark:bg-red-900/20 rounded p-3"
                      >
                        <div className="text-sm font-medium text-red-700 dark:text-red-300">
                          {item.file_path}
                        </div>
                        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {item.error_message}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={handleViewJsonReport} className="rounded-xl px-4 py-2 text-sm">
                {t('filemanager.batch.viewJsonReport')}
              </Button>
              <Button variant="outline" onClick={handleContinue} className="rounded-xl px-4 py-2 text-sm">
                {t('filemanager.batch.retryFailed')}
              </Button>
            </div>
          </div>
        )}
      </GlassModalShell>

      {showJsonReport ? (
        <GlassModalShell
          title={t('filemanager.batch.jsonReport')}
          subtitle={taskId}
          icon={<FileJson size={24} />}
          onClose={() => setShowJsonReport(false)}
          compact="all"
          nested
          maxWidthClassName="max-w-3xl"
          closeButton={(
            <Button variant="ghost" size="sm" onClick={() => setShowJsonReport(false)} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5 shrink-0">
              <X size={24} className="opacity-40" />
            </Button>
          )}
        >
        <div className="space-y-4">
          <pre className="text-sm bg-black/10 rounded-xl p-4 overflow-auto max-h-[60vh]">
            {jsonReportData || ''}
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowJsonReport(false)}>
              {t('common.close')}
            </Button>
            <Button variant="primary" onClick={handleDownloadJson}>
              {t('filemanager.batch.downloadJson')}
            </Button>
          </div>
        </div>
        </GlassModalShell>
      ) : null}
    </>
  );
}
