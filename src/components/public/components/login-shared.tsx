import { ChevronRight, Users } from 'lucide-react';

import { cn } from '@/lib/utils';
import { normalizeEmailInput, normalizePhoneInput } from '@/lib/contactNormalize';
import type { RouteParams } from '@/stores/navigation';
import type { SystemCapabilities } from '@/stores/config';

export const normalizeLoginIdentifierInput = (identifier: string) => {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    return normalizeEmailInput(trimmed);
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed;
  }
  if (!/^[+()\-\s\d]+$/.test(trimmed)) {
    return trimmed;
  }
  const normalized = normalizePhoneInput(trimmed);
  if (normalized.length > 5 && /^\+?\d+$/.test(normalized)) {
    return normalized;
  }
  return trimmed;
};

const parseRouteParams = (route: string): Partial<RouteParams> => {
  const normalized = route.startsWith('#') ? route.slice(1) : route;
  const searchParams = new URLSearchParams(normalized);
  const params: Partial<RouteParams> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

const isAddressLikeTarget = (target: string): boolean =>
  target.startsWith('http://')
  || target.startsWith('https://')
  || target.startsWith('/')
  || target.startsWith('./')
  || target.startsWith('../')
  || target.startsWith('#');

const isSupportedLoginRoute = (params: Partial<RouteParams>): boolean => {
  if (params.mod === 'file-manager') {
    return ['files', 'recent', 'trash', 'favorites', 'shares'].includes(params.page ?? '');
  }
  if (params.mod === 'user') {
    return ['welcome', 'profile', 'security', 'sessions', 'cache'].includes(params.page ?? '');
  }
  if (params.mod === 'admin') {
    return [
      'users',
      'user-create',
      'user-edit',
      'config',
      'permissions',
      'blacklist',
      'about',
      'AdminAboutPage',
      'files',
      'fs',
      'mounts',
      'backup',
      'domain-ddns',
      'domain-ssl',
      'web',
      'audit',
      'tasks',
    ].includes(params.page ?? '');
  }
  if (params.mod === 'public') {
    return ['index', 'login', 'register', 'forgot-password', 'accounts'].includes(params.page ?? '');
  }
  return false;
};

const resolveInternalTarget = (
  route: string,
): { type: 'internal'; params: Partial<RouteParams> } | null => {
  const parsed = parseRouteParams(route);
  if (!isSupportedLoginRoute(parsed)) {
    return null;
  }
  return { type: 'internal', params: parsed };
};

const resolveAddressTarget = (
  target: string,
):
  | { type: 'external'; href: string }
  | { type: 'internal'; params: Partial<RouteParams> }
  | null => {
  const trimmed = target.trim();
  if (!trimmed) return null;

  if (isAddressLikeTarget(trimmed)) {
    try {
      const url = new URL(trimmed, window.location.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname && url.hash) {
        return resolveInternalTarget(url.hash);
      }
      return { type: 'external', href: url.toString() };
    } catch (error) {
      console.error('Invalid login target URL', error);
      return null;
    }
  }

  if (trimmed.includes('mod=') || trimmed.startsWith('mod=')) {
    return resolveInternalTarget(trimmed);
  }

  return null;
};

export const getDefaultLoginDestination = (
  capabilities: SystemCapabilities | null,
): { type: 'external'; href: string } | { type: 'internal'; params: Partial<RouteParams> } => {
  const configured = capabilities?.default_login_route?.trim();
  if (configured) {
    const resolved = resolveAddressTarget(configured);
    if (resolved) {
      return resolved;
    }
  }
  return { type: 'internal', params: { mod: 'file-manager', page: 'files' } };
};

export const resolveLoginSuccessRoute = ({
  redirect,
  capabilities,
}: {
  redirect?: string;
  capabilities: SystemCapabilities | null;
}):
  | { type: 'external'; href: string }
  | { type: 'internal'; params: Partial<RouteParams> } => {
  if (redirect) {
    const resolved = resolveAddressTarget(redirect);
    if (resolved) {
      return resolved;
    }
  }

  return getDefaultLoginDestination(capabilities);
};

type SavedAccountsShortcutProps = {
  count: number;
  isDark: boolean;
  title: string;
  description: string;
  onClick: () => void;
};

export const SavedAccountsShortcut = ({
  count,
  isDark,
  title,
  description,
  onClick,
}: SavedAccountsShortcutProps) => {
  if (count <= 0) return null;

  return (
    <button
      type="button"
      className={cn(
        'mb-8 p-4 rounded-3xl border flex items-center justify-between group cursor-pointer transition-all',
        isDark ? 'bg-primary/5 border-primary/10 hover:bg-primary/10' : 'bg-primary/5 border-primary/20 hover:bg-primary/10',
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Users size={20} />
        </div>
        <div>
          <p className={cn('text-sm font-black leading-tight', isDark ? 'text-white' : 'text-gray-900')}>
            {title}
          </p>
          <p className="text-sm opacity-40 font-bold tracking-tighter">{description}</p>
        </div>
      </div>
      <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};
