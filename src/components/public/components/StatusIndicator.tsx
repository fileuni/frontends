import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  useFileStore,
  type TaskState,
} from "@/components/file-manager/store/useFileStore.ts";
import {
  useNotificationStore,
  type Notification,
} from "@/stores/notification.ts";
import {
  useMessageCenterStore,
  type MessageCenterItem,
} from "@/stores/messageCenter.ts";
import { useAuthStore } from "@/stores/auth.ts";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  Info,
  Inbox,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { client, extractData } from "@/lib/api.ts";
import { buildChatViewHash, fetchChatPluginRooms, isChatPluginInstalled, type ChatRoomSummary } from "@/lib/chat-plugin.ts";
import { isChatNotification, resolveNotificationHref } from "@/lib/notification-actions.ts";
import { fetchPluginNavItems, isChatPluginNavItem, type PluginNavItem } from "@/lib/plugin-nav.ts";
import { formatDistanceToNow } from "date-fns";
import { zhCN, zhTW, enUS } from "date-fns/locale";
import { useLanguageStore } from '@/stores/language';
import { isRecord } from "@/lib/configObject.ts";
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer.ts';

const getTaskTypeLabel = (
  t: ReturnType<typeof useTranslation>['t'],
  taskType: string,
): string => {
  switch (taskType) {
    case 'compress':
      return t('filemanager.task.type.compress');
    case 'decompress':
      return t('filemanager.task.type.decompress');
    case 'batch_delete':
      return t('filemanager.task.type.batch_delete');
    case 'batch_move':
      return t('filemanager.task.type.batch_move');
    case 'batch_copy':
      return t('filemanager.task.type.batch_copy');
    case 'video_compress':
      return t('filemanager.task.type.video_compress');
    default:
      return taskType;
  }
};

const isTaskStatusValue = (
  value: unknown,
): value is TaskState["status"] => {
  return value === "queued"
    || value === "pending"
    || value === "running"
    || value === "success"
    || value === "failed"
    || value === "interrupted";
};

const isTaskStatusUpdate = (
  value: unknown,
): value is Pick<TaskState, "status" | "progress"> & { message?: string } => {
  if (!isRecord(value)) return false;
  if (!isTaskStatusValue(value["status"])) return false;
  if (typeof value["progress"] !== "number" || !Number.isFinite(value["progress"])) {
    return false;
  }
  if (value["message"] !== undefined && typeof value["message"] !== "string") {
    return false;
  }
  return true;
};

const EMPTY_TASKS: TaskState[] = [];

type MessageFeedItem = {
  id: string;
  title: string;
  content: string;
  level: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  isRead: boolean;
  kind: 'notification' | 'local-toast';
  notification?: Notification;
  localItem?: MessageCenterItem;
};

export const StatusIndicator = ({ isDark }: { isDark: boolean }) => {
  const { t } = useTranslation();
  const { isLoggedIn, _hasHydrated, currentUserId } = useAuthStore();
  const rawTasks = useFileStore((state) => state.userStates[currentUserId || 'guest']?.activeTasks ?? EMPTY_TASKS);
  const tasks = useMemo(() => {
    const now = Date.now();
    return rawTasks.filter((task) => {
      const createdAt = Date.parse(task.createdAt);
      if (!Number.isFinite(createdAt)) {
        return true;
      }
      const ageMs = now - createdAt;
      if (task.status === 'success' || task.status === 'failed' || task.status === 'interrupted') {
        return ageMs < 30 * 60 * 1000;
      }
      return ageMs < 6 * 60 * 60 * 1000;
    });
  }, [rawTasks]);

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
  } = useNotificationStore();
  const localMessageItems = useMessageCenterStore((state) => state.items);
  const localUnreadCount = useMessageCenterStore((state) => state.unreadCount());
  const markLocalAsRead = useMessageCenterStore((state) => state.markAsRead);
  const markAllLocalAsRead = useMessageCenterStore((state) => state.markAllAsRead);
  const deleteLocalItems = useMessageCenterStore((state) => state.deleteItems);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "notifications" | "chat">("tasks");
  const [chatNavItem, setChatNavItem] = useState<PluginNavItem | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoomSummary[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);

  const runningCount = useMemo(
    () =>
      tasks.filter((t) => t.status === "running" || t.status === "pending")
        .length,
    [tasks],
  );
  const chatPluginAvailable = Boolean(chatNavItem);
  const chatNotifications = useMemo(
    () => (chatPluginAvailable
      ? notifications.filter((notification) => isChatNotification(notification))
      : []),
    [chatPluginAvailable, notifications],
  );
  const generalNotifications = useMemo(
    () => (chatPluginAvailable
      ? notifications.filter((notification) => !isChatNotification(notification))
      : notifications),
    [chatPluginAvailable, notifications],
  );
  const chatUnreadCount = useMemo(
    () => chatNotifications.filter((notification) => !notification.is_read).length,
    [chatNotifications],
  );
  const generalUnreadCount = useMemo(
    () => generalNotifications.filter((notification) => !notification.is_read).length,
    [generalNotifications],
  );

  const notificationFeed = useMemo<MessageFeedItem[]>(() => {
    const remoteItems: MessageFeedItem[] = generalNotifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      content: notification.content,
      level: notification.level,
      createdAt: notification.created_at,
      isRead: notification.is_read,
      kind: 'notification',
      notification,
    }));

    const localItems: MessageFeedItem[] = localMessageItems.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      level: item.level,
      createdAt: item.createdAt,
      isRead: item.isRead,
      kind: 'local-toast',
      localItem: item,
    }));

    return [...localItems, ...remoteItems].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [generalNotifications, localMessageItems]);

  const totalAlerts = runningCount + unreadCount + localUnreadCount;
  const hasFinishedTasks = useMemo(
    () => tasks.some((task) => task.status === 'success' || task.status === 'failed' || task.status === 'interrupted'),
    [tasks],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchUnreadCount();
      void fetchNotifications();
    }
  }, [isOpen, fetchUnreadCount, fetchNotifications]);

  useEffect(() => {
    if (!_hasHydrated || !isLoggedIn) {
      setChatNavItem(null);
      setChatRooms([]);
      setChatError(null);
      return;
    }

    let cancelled = false;
    void fetchPluginNavItems()
      .then(async (items) => {
        const resolvedItem = items.find((item) => isChatPluginNavItem(item)) ?? null;
        if (resolvedItem) {
          return resolvedItem;
        }
        const installed = await isChatPluginInstalled();
        if (!installed) {
          return null;
        }
        return {
          plugin_id: 'com.fileuni.chat',
          item_key: 'chat-bell-entry',
          label: t('common.chat', { defaultValue: 'Chat' }),
          route: '/chat',
          icon: 'MessageSquare',
          visibility: 'user',
          sort_order: 100,
        } satisfies PluginNavItem;
      })
      .then((nextChatItem) => {
        if (cancelled) {
          return;
        }
        setChatNavItem(nextChatItem);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to resolve chat plugin nav item', error);
          setChatNavItem(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [_hasHydrated, isLoggedIn, t]);

  useEffect(() => {
    if (activeTab === 'chat' && !chatNavItem) {
      setActiveTab('notifications');
    }
  }, [activeTab, chatNavItem]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'chat' || !chatNavItem) {
      return;
    }

    let cancelled = false;
    setChatLoading(true);
    setChatError(null);
    void fetchChatPluginRooms(chatNavItem.plugin_id)
      .then((rooms) => {
        if (!cancelled) {
          setChatRooms(rooms);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to load chat rooms', error);
          setChatRooms([]);
          setChatError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChatLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, chatNavItem, isOpen]);

  useEffect(() => {
    void fetchUnreadCount();

    const refreshUnreadCount = () => {
      void fetchUnreadCount();
      if (isOpen && activeTab === 'chat' && chatNavItem) {
        void fetchChatPluginRooms(chatNavItem.plugin_id)
          .then((rooms) => {
            setChatRooms(rooms);
            setChatError(null);
          })
          .catch((error) => {
            console.error('Failed to refresh chat rooms', error);
            setChatError(error instanceof Error ? error.message : String(error));
          });
      }
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshUnreadCount();
      }
    };
    const timer = setInterval(refreshUnreadCount, 15000);

    window.addEventListener("focus", refreshUnreadCount);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshUnreadCount);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, chatNavItem, fetchUnreadCount, isOpen]);

  const handleOpenNotification = async (item: MessageFeedItem) => {
    if (item.kind === 'local-toast') {
      if (item.localItem && !item.localItem.isRead) {
        markLocalAsRead([item.localItem.id]);
      }
      const href = item.localItem?.action?.href ?? item.localItem?.action?.hash;
      if (!href) {
        return;
      }
      setIsOpen(false);
      window.location.hash = href;
      return;
    }

    const notification = item.notification;
    if (!notification) {
      return;
    }

    if (!notification.is_read) {
      await markAsRead([notification.id]);
    }

    const href = resolveNotificationHref(notification);
    if (!href) {
      return;
    }

    setIsOpen(false);
    window.location.hash = href;
  };

  const handleOpenChat = useCallback((roomId?: string, messageId?: string) => {
    if (!chatNavItem) {
      return;
    }

    setIsOpen(false);
    window.location.hash = buildChatViewHash(chatNavItem.route || '/chat', roomId, messageId);
  }, [chatNavItem]);

  const activeTabAction = useMemo(() => {
    if (activeTab === 'tasks') {
      return {
        visible: hasFinishedTasks,
        label: t('common.clear', { defaultValue: 'Clear' }),
        onClick: () => useFileStore.getState().clearFinishedTasks(),
      };
    }
    if (activeTab === 'notifications') {
      return {
        visible: generalUnreadCount + localUnreadCount > 0,
        label: t('common.markAllRead', { defaultValue: 'Mark all as read' }),
        onClick: () => {
          void markAllAsRead();
          markAllLocalAsRead();
        },
      };
    }
    if (activeTab === 'chat' && chatNavItem) {
      return {
        visible: true,
        label: t('common.openChat', { defaultValue: 'Open Chat' }),
        onClick: () => handleOpenChat(),
      };
    }
    return null;
  }, [activeTab, chatNavItem, generalUnreadCount, handleOpenChat, hasFinishedTasks, localUnreadCount, markAllAsRead, markAllLocalAsRead, t]);

  const visibleTabs = useMemo(
    () => [
      {
        key: 'tasks' as const,
        label: t('filemanager.task.center'),
        count: tasks.length,
      },
      ...(chatNavItem ? [{
        key: 'chat' as const,
        label: t('common.chat', { defaultValue: 'Chat' }),
        count: chatUnreadCount,
      }] : []),
      {
        key: 'notifications' as const,
        label: t('common.notifications', { defaultValue: 'Notifications' }),
        count: generalUnreadCount + localUnreadCount,
      },
    ],
    [chatNavItem, chatUnreadCount, generalUnreadCount, localUnreadCount, t, tasks.length],
  );

  useEscapeToCloseTopLayer({
    active: isOpen,
    onEscape: () => setIsOpen(false),
  });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (triggerRef.current?.contains(target)) {
        return;
      }
      if (desktopPanelRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-2 rounded-xl transition-all relative flex items-center justify-center border",
          isDark
            ? "bg-white/5 border-white/10 hover:bg-white/10 text-primary"
            : "bg-gray-100 border-gray-200 hover:bg-gray-200 text-primary",
          totalAlerts > 0 && "animate-pulse-subtle",
        )}
      >
        {runningCount > 0 ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Bell size={20} />
        )}

        {totalAlerts > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-sm font-bold text-white shadow-lg ring-2 ring-background">
            {totalAlerts > 99 ? "99+" : totalAlerts}
          </span>
        )}
      </button>

      {isOpen && mounted && createPortal(
        <>
          <button
            type="button"
            aria-label={t('common.close', { defaultValue: 'Close' })}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[120] hidden md:block"
          />

          <div
            ref={desktopPanelRef}
            className={cn(
              'fixed right-4 top-19 z-[130] hidden w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.25rem] border shadow-[0_18px_42px_rgba(0,0,0,0.24)] md:flex md:max-h-[min(78vh,38rem)] md:flex-col',
              isDark
                ? 'border-white/10 bg-zinc-950 text-white'
                : 'border-gray-200 bg-white text-gray-900',
            )}
          >
            <BellPanelContent
              isDark={isDark}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              visibleTabs={visibleTabs}
              activeTabAction={activeTabAction}
              onClose={() => setIsOpen(false)}
            >
              {activeTab === 'tasks' ? (
                <TaskList tasks={tasks} isDark={isDark} />
              ) : activeTab === 'chat' ? (
                <ChatList
                  rooms={chatRooms}
                  loading={chatLoading}
                  error={chatError}
                  isDark={isDark}
                  onOpen={handleOpenChat}
                />
              ) : (
                <NotificationList
                  notifications={notificationFeed}
                  isDark={isDark}
                  onDelete={async (ids) => {
                    const localIds = notificationFeed
                      .filter((item) => ids.includes(item.id) && item.kind === 'local-toast')
                      .map((item) => item.id);
                    const remoteIds = notificationFeed
                      .filter((item) => ids.includes(item.id) && item.kind === 'notification' && item.notification)
                      .flatMap((item) => item.notification ? [item.notification.id] : []);

                    if (localIds.length > 0) {
                      deleteLocalItems(localIds);
                    }
                    if (remoteIds.length > 0) {
                      await deleteNotifications(remoteIds);
                    }
                  }}
                  onOpen={handleOpenNotification}
                  canOpenNotification={(item) => {
                    if (item.kind === 'local-toast') {
                      return Boolean(item.localItem?.action?.href || item.localItem?.action?.hash);
                    }
                    const notification = item.notification;
                    if (!notification) {
                      return false;
                    }
                    return !isChatNotification(notification) || chatPluginAvailable;
                  }}
                  pluginUnavailableLabel={t('common.chatUnavailable', { defaultValue: 'Chat is unavailable right now' })}
                />
              )}
            </BellPanelContent>
          </div>

          <div className="fixed inset-x-0 top-16 z-[130] overflow-hidden px-2 pt-2 md:hidden">
            <button
              type="button"
              aria-label={t('common.close', { defaultValue: 'Close' })}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <div
              className={cn(
                'relative ml-auto flex h-[min(calc(100dvh-6rem),32rem)] w-full max-w-full flex-col overflow-hidden rounded-[1.125rem] border shadow-[0_18px_42px_rgba(0,0,0,0.22)]',
                isDark
                  ? 'border-white/10 bg-zinc-950 text-white'
                  : 'border-gray-200 bg-white text-gray-900',
              )}
            >
              <BellPanelContent
                isDark={isDark}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                visibleTabs={visibleTabs}
                activeTabAction={activeTabAction}
                onClose={() => setIsOpen(false)}
              >
                {activeTab === 'tasks' ? (
                  <TaskList tasks={tasks} isDark={isDark} />
                ) : activeTab === 'chat' ? (
                  <ChatList
                    rooms={chatRooms}
                    loading={chatLoading}
                    error={chatError}
                    isDark={isDark}
                    onOpen={handleOpenChat}
                  />
                ) : (
                  <NotificationList
                    notifications={notificationFeed}
                    isDark={isDark}
                    onDelete={async (ids) => {
                      const localIds = notificationFeed
                        .filter((item) => ids.includes(item.id) && item.kind === 'local-toast')
                        .map((item) => item.id);
                      const remoteIds = notificationFeed
                        .filter((item) => ids.includes(item.id) && item.kind === 'notification' && item.notification)
                        .flatMap((item) => item.notification ? [item.notification.id] : []);

                      if (localIds.length > 0) {
                        deleteLocalItems(localIds);
                      }
                      if (remoteIds.length > 0) {
                        await deleteNotifications(remoteIds);
                      }
                    }}
                    onOpen={handleOpenNotification}
                    canOpenNotification={(item) => {
                      if (item.kind === 'local-toast') {
                        return Boolean(item.localItem?.action?.href || item.localItem?.action?.hash);
                      }
                      const notification = item.notification;
                      if (!notification) {
                        return false;
                      }
                      return !isChatNotification(notification) || chatPluginAvailable;
                    }}
                    pluginUnavailableLabel={t('common.chatUnavailable', { defaultValue: 'Chat is unavailable right now' })}
                  />
                )}
              </BellPanelContent>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
};

interface BellTabDefinition {
  key: 'tasks' | 'notifications' | 'chat';
  label: string;
  count: number;
}

const formatTabCount = (count: number): string => {
  if (count > 99) {
    return '99+';
  }
  return String(count);
};

interface BellPanelAction {
  visible: boolean;
  label: string;
  onClick: () => void;
}

interface BellPanelContentProps {
  isDark: boolean;
  activeTab: 'tasks' | 'notifications' | 'chat';
  setActiveTab: (tab: 'tasks' | 'notifications' | 'chat') => void;
  visibleTabs: BellTabDefinition[];
  activeTabAction: BellPanelAction | null;
  onClose: () => void;
  children: ReactNode;
}

const BellPanelContent = ({
  isDark,
  activeTab,
  setActiveTab,
  visibleTabs,
  activeTabAction,
  onClose,
  children,
}: BellPanelContentProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn(
        'shrink-0 border-b px-3 pb-2 pt-2 md:px-4 md:pb-2.5 md:pt-2.5',
        isDark ? 'border-white/10' : 'border-gray-200',
      )}>
        <div className="mb-2 flex items-start justify-between gap-3 md:mb-2.5">
          <div className="min-w-0">
            <p className="text-[13px] font-black tracking-wide md:text-sm">
              {t('common.notifications', { defaultValue: 'Notifications' })}
            </p>
            <p className="mt-0.5 text-xs opacity-45 md:text-[13px]">
              {activeTab === 'tasks'
                ? t('filemanager.task.center')
                : activeTab === 'chat'
                  ? t('common.chat', { defaultValue: 'Chat' })
                  : t('common.notifications', { defaultValue: 'Notifications' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors md:h-9 md:w-9',
              isDark
                ? 'border-white/10 bg-white/5 hover:bg-white/10'
                : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
            )}
            aria-label={t('common.close', { defaultValue: 'Close' })}
            title={t('common.close', { defaultValue: 'Close' })}
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
          <div
            className={cn(
              'grid min-w-0 items-end gap-1.5 border-b pb-0.5',
              isDark ? 'border-white/10' : 'border-gray-200',
            )}
            style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
          >
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative min-w-0 px-1 pb-2 pt-1 text-center text-[13px] font-black transition-all md:text-sm',
                  activeTab === tab.key
                    ? isDark
                      ? 'text-white'
                      : 'text-gray-900'
                    : isDark
                      ? 'text-white/55 hover:text-white/80'
                      : 'text-gray-500 hover:text-gray-800',
                )}
              >
                <span className="inline-flex max-w-full items-center justify-center gap-1 truncate whitespace-nowrap">
                  <span className="truncate">{tab.label}</span>
                  <span className="shrink-0 text-[11px] opacity-70">{formatTabCount(tab.count)}</span>
                </span>
                <span
                  className={cn(
                    'absolute inset-x-1 bottom-0 h-0.5 rounded-full transition-opacity',
                    activeTab === tab.key
                      ? 'opacity-100 bg-primary'
                      : 'opacity-0',
                  )}
                />
              </button>
            ))}
          </div>
          {activeTabAction?.visible && (
            <button
              type="button"
              onClick={activeTabAction.onClick}
              className={cn(
                'min-h-10 w-full shrink-0 rounded-2xl border px-4 text-sm font-black transition-colors md:w-auto',
                isDark
                  ? 'border-white/10 bg-white/5 hover:bg-white/10'
                  : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
              )}
            >
              {activeTabAction.label}
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-2 md:p-3">
        {children}
      </div>
    </div>
  );
};

const TaskItem = ({ task, isDark }: { task: TaskState; isDark: boolean }) => {
  const { t } = useTranslation();
  const { updateTask, removeTask } = useFileStore();
  const taskStatusLabel = task.status === 'queued'
    ? t('filemanager.batch.status_queued')
    : task.status === 'pending'
      ? t('filemanager.batch.status_pending')
      : task.status === 'running'
        ? t('filemanager.batch.status_running')
        : task.status === 'success'
          ? t('filemanager.batch.status_success')
          : task.status === 'failed'
            ? t('filemanager.batch.status_failed')
            : t('filemanager.batch.status_interrupted');

  useEffect(() => {
    if (
      task.status === "success" ||
      task.status === "failed" ||
      task.status === "interrupted"
    ) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const taskData = await extractData<unknown>(client.GET("/api/v1/file/task/{id}", {
          params: { path: { id: task.id } },
        }));

        if (isTaskStatusUpdate(taskData)) {
          updateTask(task.id, {
            status: taskData.status,
            progress: taskData.progress,
            ...(taskData.message ? { message: taskData.message } : {}),
          });
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [task.id, task.status, updateTask]);

  return (
    <div
      className={cn(
        "p-3 rounded-xl border group transition-all",
        isDark
          ? "bg-white/5 border-white/5 hover:bg-white/10"
          : "bg-gray-50 border-gray-100 hover:bg-gray-100",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black truncate">
            {getTaskTypeLabel(t, task.type)}
          </p>
          <p className="text-sm opacity-40 mt-0.5 truncate">
            {task.message ||
              (task.status === "running"
                ? t('filemanager.batch.status_running')
                : task.status === "queued"
                  ? t('filemanager.batch.status_queued')
                  : t('filemanager.batch.status_pending'))}
          </p>
        </div>
        {(task.status === "success" || task.status === "failed") && (
          <button
            type="button"
            onClick={() => removeTask(task.id)}
            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex justify-between text-[14px] font-black tracking-tight">
          <span
            className={cn(
              task.status === "success"
                ? "text-green-500"
                : task.status === "failed"
                  ? "text-red-500"
                  : "opacity-40",
            )}
          >
            {taskStatusLabel}
          </span>
          <span className="opacity-60">{task.progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500",
              task.status === "failed"
                ? "bg-red-500"
                : task.status === "success"
                  ? "bg-green-500"
                  : "bg-primary",
            )}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const TaskList = ({
  tasks,
  isDark,
}: {
  tasks: TaskState[];
  isDark: boolean;
}) => {
  const { t } = useTranslation();

  if (tasks.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center opacity-20 gap-3">
        <RefreshCw size={40} className="animate-spin-slow" />
        <p className="text-sm font-black tracking-widest">
          {t("filemanager.task.allFinished")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} isDark={isDark} />
      ))}
    </div>
  );
};

interface ChatListProps {
  rooms: ChatRoomSummary[];
  loading: boolean;
  error: string | null;
  isDark: boolean;
  onOpen: (roomId?: string, messageId?: string) => void;
}

const ChatList = ({
  rooms,
  loading,
  error,
  isDark,
  onOpen,
}: ChatListProps) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center opacity-40 gap-3">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm font-black tracking-widest">
          {t("common.loading", { defaultValue: "Loading" })}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 flex flex-col items-center justify-center opacity-40 gap-3 text-center px-4">
        <AlertCircle size={32} />
        <p className="text-sm font-black tracking-widest">
          {t("common.chatUnavailable", { defaultValue: "Chat is unavailable right now" })}
        </p>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center opacity-20 gap-3">
        <Inbox size={40} />
        <p className="text-sm font-black tracking-widest">
          {t("common.noChats", { defaultValue: "No chats yet" })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {rooms.map((room) => (
        <button
          key={room.id}
          type="button"
          onClick={() => onOpen(room.id, room.last_message?.id ?? undefined)}
          className={cn(
            "w-full p-3 rounded-xl border transition-all text-left relative overflow-hidden",
            isDark
              ? "bg-white/5 border-white/5 hover:bg-white/10"
              : "bg-gray-50 border-gray-100 hover:bg-gray-100",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black truncate">{room.name}</p>
              <p className="text-sm opacity-60 mt-1 leading-relaxed line-clamp-2">
                {room.last_message?.content || t("common.noChats", { defaultValue: "No chats yet" })}
              </p>
              {room.last_message?.from && (
                <div className="mt-2 text-[14px] font-black opacity-30 truncate">
                  {room.last_message.from}
                </div>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              {room.unread_count > 0 && (
                <span className="inline-flex min-w-6 h-6 px-2 items-center justify-center rounded-full bg-primary text-white text-sm font-black">
                  {room.unread_count > 99 ? '99+' : room.unread_count}
                </span>
              )}
              <ExternalLink size={18} className="text-primary" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

interface NotificationListProps {
  notifications: MessageFeedItem[];
  isDark: boolean;
  onDelete: (ids: string[]) => Promise<void>;
  onOpen: (item: MessageFeedItem) => Promise<void>;
  canOpenNotification: (item: MessageFeedItem) => boolean;
  pluginUnavailableLabel: string;
}

const NotificationList = ({
  notifications,
  isDark,
  onDelete,
  onOpen,
  canOpenNotification,
  pluginUnavailableLabel,
}: NotificationListProps) => {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const dateLocale = language === 'zh-CN' ? zhCN : language === 'zh-Hant' ? zhTW : enUS;

  if (notifications.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center opacity-20 gap-3">
        <Inbox size={40} />
        <p className="text-sm font-black tracking-widest">
          {t("common.noNotifications", { defaultValue: "No notifications" })}
        </p>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case "success":
        return "text-green-500 bg-green-500/10";
      case "warning":
        return "text-yellow-500 bg-yellow-500/10";
      case "error":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-blue-500 bg-blue-500/10";
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "success":
        return <CheckCircle2 size={18} />;
      case "warning":
        return <AlertCircle size={18} />;
      case "error":
        return <AlertCircle size={18} />;
      default:
        return <Info size={18} />;
    }
  };

  return (
    <div className="space-y-1">
      {notifications.map((item) => {
        const remoteNotification = item.notification;
        const href = item.kind === 'notification' && remoteNotification
          ? resolveNotificationHref(remoteNotification)
          : (item.localItem?.action?.href ?? item.localItem?.action?.hash ?? null);
        const canOpen = canOpenNotification(item);
        const canNavigate = Boolean(href) && canOpen;

        return (
          <div
            key={item.id}
            className={cn(
              "p-3 rounded-xl border transition-all relative overflow-hidden",
              isDark
                ? "bg-white/5 border-white/5 hover:bg-white/10"
                : "bg-gray-50 border-gray-100 hover:bg-gray-100",
              !item.isRead &&
                (isDark
                  ? "ring-1 ring-primary/30 bg-primary/5"
                  : "ring-1 ring-primary/20 bg-primary/5"),
            )}
          >
            {!item.isRead && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-bl-lg" />
            )}

            <div className="flex gap-3">
              <div
                className={cn(
                  "mt-0.5 p-1.5 rounded-lg shrink-0",
                  getLevelColor(item.level),
                )}
              >
                {getLevelIcon(item.level)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black truncate">{item.title}</p>
                    <p className="text-sm opacity-60 mt-1 leading-relaxed line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                  <span className="text-[14px] font-black opacity-30 whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  {!canNavigate && href ? (
                    <span className="text-[14px] font-black opacity-40 truncate">
                      {pluginUnavailableLabel}
                    </span>
                  ) : <span />}
                  <div className="flex justify-end gap-2">
                    {canNavigate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void onOpen(item);
                        }}
                        title={t("common.viewDetails", { defaultValue: "View Details" })}
                        aria-label={t("common.viewDetails", { defaultValue: "View Details" })}
                        className="p-1 rounded hover:bg-primary/10 text-primary"
                      >
                        <ExternalLink size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onDelete([item.id]);
                      }}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      title={t("common.delete", { defaultValue: "Delete" })}
                      aria-label={t("common.delete", { defaultValue: "Delete" })}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Email account type
