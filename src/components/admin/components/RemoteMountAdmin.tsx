import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cloud, RefreshCw, Search, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { client, extractData, handleApiError } from '@/lib/api.ts';
import type { components } from '@/types/api.ts';
import { useToastStore } from '@/stores/toast';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { AdminCard, AdminEmptyState, AdminLoadingState, AdminPage, AdminPageHeader } from './admin-ui';
import { RemoteMountManagerModal } from '@/components/file-manager/components/RemoteMountManagerModal.tsx';
import { cn } from '@/lib/utils.ts';

type PolicyDto = {
  max_private_mounts: number;
  min_sync_interval_minutes: number;
  max_sync_timeout_secs: number;
  current_mounts: number;
};

type MountDto = {
  id: string;
  name: string;
  driver: string;
  root: string;
  mount_dir: string;
  sync_peer_dir?: string | null;
  sync_mode: number;
  sync_interval_minutes: number;
  sync_timeout_secs: number;
  enable: boolean;
  options: Record<string, string>;
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  last_sync_status?: string | null;
  last_error?: string | null;
};

type AdminMountUserDto = {
  user_id: string;
  username: string;
  role_id: number;
};

type AdminMountRecordDto = {
  user: AdminMountUserDto;
  mount: MountDto;
  policy: PolicyDto;
};

type AdminMountListDto = {
  items: AdminMountRecordDto[];
};

type UserResponse = components['schemas']['UserResponse'];

const ADMIN_USER_PAGE_SIZE = 100;

const parseAdminUserPage = (
  payload: UserResponse[] | { users?: UserResponse[]; total?: number },
): { users: UserResponse[]; total: number } => {
  if (Array.isArray(payload)) {
    return { users: payload, total: payload.length };
  }

  const users = Array.isArray(payload.users) ? payload.users : [];
  return {
    users,
    total: typeof payload.total === 'number' ? payload.total : users.length,
  };
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export const RemoteMountAdmin = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AdminMountRecordDto[]>([]);
  const [users, setUsers] = useState<AdminMountUserDto[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminMountUserDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const mountPromise = extractData<AdminMountListDto>(client.GET('/api/v1/file/admin/mounts', {}));

      const allUsers: UserResponse[] = [];
      let page = 1;
      let total = 0;
      do {
        const pageResult = await extractData<UserResponse[] | { users?: UserResponse[]; total?: number }>(
          client.GET('/api/v1/users/admin/users', {
            params: {
              query: {
                page,
                page_size: ADMIN_USER_PAGE_SIZE,
                include_deleted: false,
              },
            },
          }),
        );
        const parsedPage = parseAdminUserPage(pageResult);
        allUsers.push(...parsedPage.users);
        total = parsedPage.total;
        page += 1;
      } while (allUsers.length < total);

      const mountResult = await mountPromise;
      setRecords(mountResult.items);

      setUsers(allUsers.map((user) => ({
        user_id: user.id,
        username: user.username,
        role_id: user.role_id,
      })));
    } catch (error) {
      addToast(handleApiError(error, t), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const groupedUsers = useMemo(() => {
    const groups = new Map<string, { user: AdminMountUserDto; mounts: AdminMountRecordDto[]; policy: PolicyDto | null }>();
    for (const user of users) {
      groups.set(user.user_id, {
        user,
        mounts: [],
        policy: null,
      });
    }
    for (const record of records) {
      const existing = groups.get(record.user.user_id);
      if (existing) {
        existing.mounts.push(record);
        existing.policy = record.policy;
      } else {
        groups.set(record.user.user_id, {
          user: record.user,
          mounts: [record],
          policy: record.policy,
        });
      }
    }
    return Array.from(groups.values());
  }, [records, users]);

  const filteredUsers = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return groupedUsers;
    return groupedUsers.filter(({ user, mounts }) => {
      if (user.username.toLowerCase().includes(normalized) || user.user_id.toLowerCase().includes(normalized)) {
        return true;
      }
      return mounts.some(({ mount }) => {
        return mount.name.toLowerCase().includes(normalized)
          || mount.mount_dir.toLowerCase().includes(normalized)
          || mount.driver.toLowerCase().includes(normalized)
          || (mount.sync_peer_dir?.toLowerCase().includes(normalized) ?? false);
      });
    });
  }, [groupedUsers, keyword]);

  return (
    <AdminPage>
      <AdminPageHeader
        icon={<Cloud size={24} />}
        title={t('admin.mounts.title') || 'Remote Mounts'}
        subtitle={t('admin.mounts.subtitle') || 'Review and manage all user remote mounts and sync rules'}
        actions={
          <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
            <div className="relative flex-1 md:w-80 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={18} />
              <Input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={t('admin.mounts.search') || 'Search user or mount path'}
                className="h-12 pl-12"
              />
            </div>
            <Button className="h-12 rounded-xl" variant="outline" onClick={() => void loadRecords()}>
              <RefreshCw size={18} className={cn(loading && 'animate-spin')} />
            </Button>
            <Button
              className="h-12 rounded-xl"
              onClick={() => {
                setSelectedUser(filteredUsers[0]?.user ?? users[0] ?? null);
                setIsModalOpen(true);
              }}
              disabled={(filteredUsers[0]?.user ?? users[0] ?? null) === null}
            >
              {t('filemanager.mounts.add') || 'Add Mount'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <AdminLoadingState label={t('admin.loading')} />
      ) : filteredUsers.length === 0 ? (
        <AdminEmptyState
          icon={<Cloud size={24} />}
          title={t('admin.mounts.empty') || 'No remote mounts found'}
          description={t('admin.mounts.emptyDesc') || 'Users have not configured any remote mount yet.'}
        />
      ) : (
        <div className="space-y-4">
          {filteredUsers.map(({ user, mounts, policy }) => (
            <AdminCard key={user.user_id} variant="glass" className="space-y-4 rounded-[2rem]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-black">{user.username}</div>
                  <div className="mt-1 text-sm opacity-60">{user.user_id}</div>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm opacity-80">
                    <span>{t('admin.mounts.role') || 'Role'}: {user.role_id}</span>
                    <span>{t('admin.mounts.count') || 'Mounts'}: {mounts.length}</span>
                      <span>{t('admin.mounts.limit') || 'Limit'}: {policy?.max_private_mounts ?? '-'}</span>
                      <span>{t('admin.mounts.minSyncInterval') || 'Min Sync'}: {policy?.min_sync_interval_minutes ?? '-' } min</span>
                      <span>{t('admin.mounts.maxSyncTimeout') || 'Max Timeout'}: {policy?.max_sync_timeout_secs ?? '-'} s</span>
                    </div>
                  </div>
                <Button
                  className="gap-2"
                  onClick={() => {
                    setSelectedUser(user);
                    setIsModalOpen(true);
                  }}
                >
                  <Settings size={16} />
                  {t('admin.mounts.manage') || 'Manage'}
                </Button>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {mounts.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-border p-4 text-sm opacity-70">
                    {t('admin.mounts.emptyDesc') || 'Users have not configured any remote mount yet.'}
                  </div>
                )}
                {mounts.map(({ mount }) => (
                  <div key={mount.id} className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-black">{mount.name || mount.mount_dir}</div>
                        <div className="mt-1 text-sm opacity-70">{mount.driver}</div>
                      </div>
                      <span className={cn(
                        'rounded-full px-2 py-1 text-xs font-black tracking-widest',
                        mount.enable ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-500/15 text-zinc-400',
                      )}>
                        {mount.enable ? (t('admin.mounts.enabled') || 'Enabled') : (t('admin.mounts.disabled') || 'Disabled')}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm opacity-80">
                      <div>{t('filemanager.mounts.mountDir') || 'Mount Directory'}: <span className="font-mono">{mount.mount_dir}</span></div>
                      <div>{t('filemanager.mounts.syncPeer') || 'Sync Peer Directory'}: <span className="font-mono">{mount.sync_peer_dir || '-'}</span></div>
                      <div>{t('filemanager.mounts.status') || 'Status'}: {mount.last_sync_status || '-'}</div>
                      <div>{t('filemanager.mounts.lastSyncAt') || 'Last Sync'}: {formatDateTime(mount.last_sync_at)}</div>
                    </div>
                    {mount.last_error && (
                      <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-400">
                        {mount.last_error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {selectedUser && (
        <RemoteMountManagerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentPath="/"
          targetUserId={selectedUser.user_id}
          title={t('admin.mounts.manageTitle', { user: selectedUser.username }) || `Remote Mounts: ${selectedUser.username}`}
          onChanged={() => {
            void loadRecords();
          }}
        />
      )}
    </AdminPage>
  );
};
