import { useAuthStore } from '@/stores/auth.ts';
import { buildPluginViewHash, CHAT_PLUGIN_ID } from '@/lib/plugin-nav.ts';

export interface ChatRoomSummary {
  id: string;
  name: string;
  is_group: boolean;
  unread_count: number;
  last_message?: {
    id: string;
    from: string;
    to: string;
    content: string;
    timestamp: number;
    transport: string;
    status: string;
    edited: boolean;
    deleted: boolean;
  } | null;
}

export async function fetchChatPluginRooms(pluginId = CHAT_PLUGIN_ID): Promise<ChatRoomSummary[]> {
  const token = useAuthStore.getState().currentUserData?.access_token;
  if (!token) {
    return [];
  }

  const response = await fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}/api/rooms`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`chat room request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as ChatRoomSummary[]) : [];
}

export async function isChatPluginInstalled(pluginId = CHAT_PLUGIN_ID): Promise<boolean> {
  const token = useAuthStore.getState().currentUserData?.access_token;
  if (!token) {
    return false;
  }

  const response = await fetch(`/api/v1/plugins/${encodeURIComponent(pluginId)}/ui`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'same-origin',
  });
  return response.ok;
}

export function buildChatViewHash(
  pluginRoute: string,
  roomId?: string,
  messageId?: string,
): string {
  const params: Record<string, string> = {};
  if (roomId) {
    params['room_id'] = roomId;
  }
  if (messageId) {
    params['message_id'] = messageId;
  }
  return buildPluginViewHash(CHAT_PLUGIN_ID, pluginRoute, params);
}
