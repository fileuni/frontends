import { isRecord } from '@/lib/configObject.ts';
import { buildPluginViewHash, CHAT_PLUGIN_ID, normalizePluginRoute } from '@/lib/plugin-nav';
import type { Notification } from '@/stores/notification.ts';

const CORE_PLUGIN_ROUTE_KEYS = new Set(['mod', 'page', 'plugin_id', 'plugin_route']);

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const buildPluginHref = (target: Record<string, unknown>): string | null => {
  const pluginId = readString(target, 'plugin_id');
  if (!pluginId) {
    return null;
  }

  const params = target['params'];
  const normalizedParams: Record<string, string | number | boolean> = {};
  if (isRecord(params)) {
    for (const [key, value] of Object.entries(params)) {
      if (CORE_PLUGIN_ROUTE_KEYS.has(key)) {
        continue;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        normalizedParams[key] = value;
      }
    }
  }

  return buildPluginViewHash(
    pluginId,
    readString(target, 'plugin_route') ?? '/',
    normalizedParams,
  );
};

export const resolveNotificationHref = (notification: Notification): string | null => {
  const extraData = notification.extra_data;
  if (!isRecord(extraData)) {
    return null;
  }

  const action = isRecord(extraData.action) ? extraData.action : extraData;
  const type = readString(action, 'type');
  if (type && type !== 'navigate') {
    return null;
  }

  const href = readString(action, 'href') ?? readString(action, 'hash');
  if (href) {
    return normalizePluginRoute(href);
  }

  const target = action['target'];
  if (!isRecord(target)) {
    return null;
  }

  const targetKind = readString(target, 'kind');
  if (targetKind && targetKind !== 'plugin') {
    return null;
  }

  return buildPluginHref(target);
};

export const hasNotificationAction = (notification: Notification): boolean => {
  return resolveNotificationHref(notification) !== null;
};

export const isChatNotification = (notification: Notification): boolean => {
  const extraData = notification.extra_data;
  if (!isRecord(extraData)) {
    return false;
  }

  if (isRecord(extraData['chat'])) {
    return true;
  }

  const action = extraData['action'];
  if (!isRecord(action)) {
    return false;
  }
  const target = action['target'];
  if (!isRecord(target)) {
    return false;
  }
  return readString(target, 'plugin_id') === CHAT_PLUGIN_ID;
};
