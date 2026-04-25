import { create } from 'zustand';

import type { ToastType } from './toast.ts';

export type MessageCenterItemSource = 'local-toast';

export interface MessageCenterActionTarget {
  href?: string;
  hash?: string;
}

export interface MessageCenterItem {
  id: string;
  title: string;
  content: string;
  level: ToastType;
  createdAt: string;
  isRead: boolean;
  source: MessageCenterItemSource;
  action?: MessageCenterActionTarget | undefined;
}

interface MessageCenterState {
  items: MessageCenterItem[];
  addItem: (item: Omit<MessageCenterItem, 'id' | 'createdAt' | 'isRead' | 'source'> & { id?: string }) => void;
  markAsRead: (ids: string[]) => void;
  markAllAsRead: () => void;
  deleteItems: (ids: string[]) => void;
  unreadCount: () => number;
}

const createLocalMessageId = (): string => {
  return `local-${Math.random().toString(36).slice(2, 12)}`;
};

export const useMessageCenterStore = create<MessageCenterState>((set, get) => ({
  items: [],

  addItem: (item) => {
    const nextItem: MessageCenterItem = {
      id: item.id ?? createLocalMessageId(),
      title: item.title,
      content: item.content,
      level: item.level,
      createdAt: new Date().toISOString(),
      isRead: false,
      source: 'local-toast',
      ...(item.action ? { action: item.action } : {}),
    };

    set((state) => ({
      items: [nextItem, ...state.items].slice(0, 50),
    }));
  },

  markAsRead: (ids) => {
    set((state) => ({
      items: state.items.map((item) => (ids.includes(item.id) ? { ...item, isRead: true } : item)),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, isRead: true })),
    }));
  },

  deleteItems: (ids) => {
    set((state) => ({
      items: state.items.filter((item) => !ids.includes(item.id)),
    }));
  },

  unreadCount: () => {
    return get().items.filter((item) => !item.isRead).length;
  },
}));
