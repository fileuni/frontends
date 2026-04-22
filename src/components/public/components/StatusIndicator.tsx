import { useState, useEffect, useMemo } from "react";
import {
  useFileStore,
  type TaskState,
} from "@/components/file-manager/store/useFileStore.ts";
import {
  useNotificationStore,
  type Notification,
} from "@/stores/notification.ts";
import { useAuthStore } from "@/stores/auth.ts";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Check,
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
    default:
      return taskType;
  }
};

const isTaskStatusValue = (
  value: unknown,
): value is TaskState["status"] => {
  return value === "pending"
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

export const StatusIndicator = ({ isDark }: { isDark: boolean }) => {
  const { t } = useTranslation();
  const { isLoggedIn, _hasHydrated } = useAuthStore();
  const getActiveTasks = useFileStore((state) => state.getActiveTasks);
  const tasks = getActiveTasks();

  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "notifications" | "chat">("tasks");
  const [chatNavItem, setChatNavItem] = useState<PluginNavItem | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoomSummary[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const runningCount = useMemo(
    () =>
      tasks.filter((t) => t.status === "running" || t.status === "pending")
        .length,
    [tasks],
  );
  const chatNotifications = useMemo(
    () => notifications.filter((notification) => isChatNotification(notification)),
    [notifications],
  );
  const generalNotifications = useMemo(
    () => notifications.filter((notification) => !isChatNotification(notification)),
    [notifications],
  );
  const chatUnreadCount = useMemo(
    () => chatNotifications.filter((notification) => !notification.is_read).length,
    [chatNotifications],
  );
  const generalUnreadCount = useMemo(
    () => generalNotifications.filter((notification) => !notification.is_read).length,
    [generalNotifications],
  );

  const totalAlerts = runningCount + unreadCount;

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

  const handleOpenNotification = async (notification: Notification) => {
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

  const handleOpenChat = (roomId?: string, messageId?: string) => {
    if (!chatNavItem) {
      return;
    }

    setIsOpen(false);
    window.location.hash = buildChatViewHash(chatNavItem.route || '/chat', roomId, messageId);
  };

  return (
    <div className="relative">
      <button
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

      {isOpen && (
        <>
          <button
            type="button"
            aria-label={t("common.close", { defaultValue: "Close" })}
            className="fixed inset-0 z-[120]"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "absolute top-full right-0 mt-2 w-80 md:w-96 max-h-[80vh] flex flex-col z-[130] rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200",
              isDark
                ? "bg-zinc-950 border-white/10"
                : "bg-white border-gray-200",
            )}
          >
            {/* Header / Tabs */}
            <div className="flex border-b shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={cn(
                  "flex-1 py-3 text-sm font-black tracking-widest transition-all relative",
                  activeTab === "tasks"
                    ? "text-primary"
                    : "opacity-40 hover:opacity-100",
                )}
              >
                {t("filemanager.task.center")}
                {tasks.length > 0 && (
                  <span className="ml-1 opacity-60">({tasks.length})</span>
                )}
                {activeTab === "tasks" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              {chatNavItem && (
                <button
                  type="button"
                  onClick={() => setActiveTab("chat")}
                  className={cn(
                    "flex-1 py-3 text-sm font-black tracking-widest transition-all relative",
                    activeTab === "chat"
                      ? "text-primary"
                      : "opacity-40 hover:opacity-100",
                  )}
                >
                  {t("common.chat", { defaultValue: "Chat" })}
                  {chatUnreadCount > 0 && (
                    <span className="ml-1 opacity-60">({chatUnreadCount})</span>
                  )}
                  {activeTab === "chat" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={cn(
                  "flex-1 py-3 text-sm font-black tracking-widest transition-all relative",
                  activeTab === "notifications"
                    ? "text-primary"
                    : "opacity-40 hover:opacity-100",
                )}
                >
                  {t("common.notifications", { defaultValue: "Notifications" })}
                  {generalUnreadCount > 0 && (
                    <span className="ml-1 opacity-60">({generalUnreadCount})</span>
                  )}
                  {activeTab === "notifications" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2">
              {activeTab === "tasks" ? (
                <TaskList tasks={tasks} isDark={isDark} />
              ) : activeTab === "chat" ? (
                <ChatList
                  rooms={chatRooms}
                  loading={chatLoading}
                  error={chatError}
                  isDark={isDark}
                  onOpen={handleOpenChat}
                />
              ) : activeTab === "notifications" ? (
                <NotificationList
                  notifications={generalNotifications}
                  isDark={isDark}
                  onDelete={deleteNotifications}
                  onOpen={handleOpenNotification}
                />
              ) : (
                <TaskList tasks={tasks} isDark={isDark} />
              )}
            </div>

            {/* Footer */}
            {activeTab === "chat" && chatNavItem && (
              <div className="p-2 border-t flex justify-end bg-muted/30">
                <button
                  type="button"
                  onClick={() => handleOpenChat()}
                  className="text-sm font-black opacity-40 hover:opacity-100 transition-all flex items-center gap-1"
                >
                  <ExternalLink size={18} />
                  {t("common.openChat", { defaultValue: "Open Chat" })}
                </button>
              </div>
            )}
            {activeTab === "notifications" && generalNotifications.length > 0 && (
              <div className="p-2 border-t flex justify-between bg-muted/30">
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="text-sm font-black opacity-40 hover:opacity-100 transition-all flex items-center gap-1"
                >
                  <Check size={18} />
                  {t("common.markAllRead", {
                    defaultValue: "Mark all as read",
                  })}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const TaskItem = ({ task, isDark }: { task: TaskState; isDark: boolean }) => {
  const { t } = useTranslation();
  const { updateTask, removeTask } = useFileStore();

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
              (task.status === "running" ? "Processing..." : "Pending...")}
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
            {task.status}
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
  const clearFinishedTasks = useFileStore((state) => state.clearFinishedTasks);

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
    <div className="space-y-1">
      <div className="flex justify-between items-center px-2 mb-2">
        <span className="text-sm font-black opacity-30 tracking-widest">
          Active Tasks
        </span>
        <button
          type="button"
          onClick={clearFinishedTasks}
          className="text-sm text-destructive font-black opacity-40 hover:opacity-100"
        >
          Clear
        </button>
      </div>
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
  notifications: Notification[];
  isDark: boolean;
  onDelete: (ids: string[]) => Promise<void>;
  onOpen: (notification: Notification) => Promise<void>;
}

const NotificationList = ({
  notifications,
  isDark,
  onDelete,
  onOpen,
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
      {notifications.map((n: Notification) => {
        const href = resolveNotificationHref(n);

        return (
          <div
            key={n.id}
            className={cn(
              "p-3 rounded-xl border transition-all relative overflow-hidden",
              isDark
                ? "bg-white/5 border-white/5 hover:bg-white/10"
                : "bg-gray-50 border-gray-100 hover:bg-gray-100",
              !n.is_read &&
                (isDark
                  ? "ring-1 ring-primary/30 bg-primary/5"
                  : "ring-1 ring-primary/20 bg-primary/5"),
            )}
          >
            {!n.is_read && (
              <div className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-bl-lg" />
            )}

            <div className="flex gap-3">
              <div
                className={cn(
                  "mt-0.5 p-1.5 rounded-lg shrink-0",
                  getLevelColor(n.level),
                )}
              >
                {getLevelIcon(n.level)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onOpen(n);
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm font-black truncate">{n.title}</p>
                    <p className="text-sm opacity-60 mt-1 leading-relaxed line-clamp-2">
                      {n.content}
                    </p>
                  </button>
                  <span className="text-[14px] font-black opacity-30 whitespace-nowrap">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                  {href && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void onOpen(n);
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
                      void onDelete([n.id]);
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
        );
      })}
    </div>
  );
};

// Email account type
