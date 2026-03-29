import { useCallback, useState } from 'react';
import type { TFunction } from 'i18next';
import { handleApiError } from '@/lib/api.ts';
import {
  deleteToolApi,
  fetchLatestToolInfoApi,
  fetchServicesApi,
  fetchToolsApi,
  installToolApi,
  serviceActionApi,
} from '../api.ts';
import type { InstallBody, ServiceStatus, ToolInfo } from '../types.ts';

export const useExtensionsBackend = ({
  t,
  addToast,
  fetchCapabilities,
}: {
  t: TFunction;
  addToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  fetchCapabilities: () => Promise<void>;
}) => {
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [serviceStatus, setServiceStatus] = useState<Record<string, ServiceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);

  const fetchTools = useCallback(async () => {
    const data = await fetchToolsApi();
    if (data) setTools(data);
  }, []);

  const fetchServices = useCallback(async () => {
    const data = await fetchServicesApi();
    if (!data) return;
    const next: Record<string, ServiceStatus> = {};
    for (const item of data) {
      next[item.tool] = item;
    }
    setServiceStatus(next);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchTools(), fetchServices(), fetchCapabilities()]);
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, fetchCapabilities, fetchServices, fetchTools, t]);

  const fetchLatestInfo = useCallback(async (tool: string) => {
    setIsFetchingInfo(true);
    try {
      const info = await fetchLatestToolInfoApi(tool);
      if (info) {
        addToast(t('admin.extensions.fetchLatestSuccess'), 'success');
      }
      return info || null;
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
      return null;
    } finally {
      setIsFetchingInfo(false);
    }
  }, [addToast, t]);

  const installTool = useCallback(async (tool: string, body: InstallBody): Promise<void> => {
    try {
      await installToolApi(tool, body);
      addToast(t('admin.extensions.downloadSuccess', { tool }), 'success');
      await fetchTools();
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    }
  }, [addToast, fetchTools, t]);

  const deleteTool = useCallback(async (tool: string): Promise<void> => {
    try {
      await deleteToolApi(tool);
      addToast(t('common.success'), 'success');
      await fetchTools();
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    }
  }, [addToast, fetchTools, t]);

  const controlService = useCallback(async (tool: string, action: 'start' | 'stop' | 'restart'): Promise<void> => {
    try {
      await serviceActionApi(tool, action);
      await fetchServices();
      addToast(t('admin.extensions.serviceActionSuccess'), 'success');
    } catch (error: unknown) {
      addToast(handleApiError(error, t), 'error');
    }
  }, [addToast, fetchServices, t]);

  return {
    tools,
    serviceStatus,
    loading,
    isFetchingInfo,
    loadAll,
    fetchLatestInfo,
    installTool,
    deleteTool,
    controlService,
  };
};
