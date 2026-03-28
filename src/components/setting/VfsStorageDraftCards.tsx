import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PasswordInput } from '@/components/common/PasswordInput';
import {
  type ConnectorDraft,
  type KvPair,
  type PolicyDraft,
  type PoolDraft,
  type VfsDriver,
  driverUsesSlashRoot,
  getConnectorFieldHintKey,
  getConnectorFieldLabelKey,
  getConnectorOptionFields,
  getOption,
  isRemoteConnectorDriver,
  normalizeOptionsForDriver,
  storageDriverOptions,
  upsertOption,
} from './vfsStorageDraftShared';

const fieldClassName = (isDark: boolean) => cn(
  'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
  isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900 shadow-sm',
);

const focusedFieldClassName = (isDark: boolean) => cn(
  fieldClassName(isDark),
  isDark ? 'focus:outline-none focus:ring-2 focus:ring-cyan-500/30' : 'focus:outline-none focus:ring-2 focus:ring-cyan-500/20',
);

const actionButtonClassName = (isDark: boolean) => cn(
  'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors',
  isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
);

const dangerButtonClassName = (isDark: boolean) => cn(
  'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors',
  isDark ? 'border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20' : 'border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100',
);

const OptionPairsEditor = memo(({
  isDark,
  ownerId,
  pairs,
  onAdd,
  onUpdate,
  onRemove,
}: {
  isDark: boolean;
  ownerId: string;
  pairs: KvPair[];
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<KvPair>) => void;
  onRemove: (index: number) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'mt-3 rounded-xl border p-3',
      isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50',
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
          {t('admin.config.storage.fields.options')}
        </div>
        <button type="button" className={cn('h-8 px-2 rounded-lg border text-xs font-black inline-flex items-center gap-2 transition-colors', actionButtonClassName(isDark))} onClick={onAdd}>
          <Plus size={14} />
          {t('admin.config.storage.actions.addOption')}
        </button>
      </div>

      <div className="mt-2 space-y-2">
        {pairs.map((pair, pairIndex) => (
          <div key={`${ownerId}-${pair.key || 'empty-key'}-${pair.value || 'empty-value'}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <input
              className={fieldClassName(isDark)}
              placeholder={t('admin.config.storage.placeholders.optionKey')}
              value={pair.key}
              onChange={(event) => onUpdate(pairIndex, { key: event.target.value })}
            />
            <input
              className={fieldClassName(isDark)}
              placeholder={t('admin.config.storage.placeholders.optionValue')}
              value={pair.value}
              onChange={(event) => onUpdate(pairIndex, { value: event.target.value })}
            />
            <button
              type="button"
              className={cn(
                'h-10 w-10 rounded-lg border inline-flex items-center justify-center transition-colors',
                isDark ? 'border-white/15 text-slate-200 hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100',
              )}
              onClick={() => onRemove(pairIndex)}
              aria-label={t('common.delete')}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

OptionPairsEditor.displayName = 'OptionPairsEditor';

const ConnectorOptionFields = memo(({
  connector,
  isDark,
  onChangeOption,
}: {
  connector: ConnectorDraft;
  isDark: boolean;
  onChangeOption: (key: string, value: string) => void;
}) => {
  const { t } = useTranslation();

  if (!isRemoteConnectorDriver(connector.driver)) {
    return null;
  }

  const fields = getConnectorOptionFields(connector.driver);
  const inputClassName = cn(
    'h-10 w-full rounded-lg border px-3 text-sm font-mono font-bold',
    isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
  );

  return (
    <div className={cn(
      'mt-3 rounded-xl border p-3',
      isDark ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50',
    )}>
      <div className={cn('text-xs font-black uppercase tracking-widest opacity-60 mb-2', isDark ? 'text-slate-300' : 'text-slate-600')}>
        {t('admin.config.storage.connectors.commonOptions')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map((field) => {
          const label = t(getConnectorFieldLabelKey(connector.driver, field.key));
          const hint = t(getConnectorFieldHintKey(connector.driver, field.key));
          const inputId = `${connector.id}-${field.key}`;

          return (
            <div
              key={`${connector.id}-${field.key}`}
              className={cn(
                'text-sm',
                field.fullWidth && 'md:col-span-2',
                isDark ? 'text-slate-300' : 'text-slate-700',
              )}
            >
              <label htmlFor={inputId} className="font-black">
                {label}
              </label>
              {field.secret ? (
                <PasswordInput
                  id={inputId}
                  wrapperClassName="mt-1"
                  inputClassName={inputClassName}
                  value={getOption(connector.options, field.key)}
                  onChange={(event) => onChangeOption(field.key, event.target.value)}
                />
              ) : (
                <input
                  id={inputId}
                  className={cn('mt-1', inputClassName)}
                  value={getOption(connector.options, field.key)}
                  onChange={(event) => onChangeOption(field.key, event.target.value)}
                />
              )}
              <div className={cn('mt-1 text-xs font-bold opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {hint}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

ConnectorOptionFields.displayName = 'ConnectorOptionFields';

export const ConnectorCard = memo(({
  connector,
  index,
  isDark,
  allowDelete,
  canPickRoot,
  isPickingRoot,
  onRenameConnector,
  onUpdateConnector,
  onRemoveConnector,
  onPickConnectorRoot,
}: {
  connector: ConnectorDraft;
  index: number;
  isDark: boolean;
  allowDelete: boolean;
  canPickRoot: boolean;
  isPickingRoot: boolean;
  onRenameConnector: (id: string, nextName: string) => void;
  onUpdateConnector: (id: string, updater: (prev: ConnectorDraft) => ConnectorDraft) => void;
  onRemoveConnector: (id: string) => void;
  onPickConnectorRoot: (id: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'rounded-2xl border p-3 sm:p-4',
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-wide truncate">
            {connector.name || `${t('admin.config.storage.connectors.connector')} #${index + 1}`}
          </div>
          <div className={cn('text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {t(`admin.config.storage.drivers.${connector.driver}`)}
          </div>
        </div>
        <button
          type="button"
          className={dangerButtonClassName(isDark)}
          onClick={() => onRemoveConnector(connector.id)}
          disabled={!allowDelete}
          title={!allowDelete ? t('admin.config.storage.validation.minimumOneConnector') : undefined}
        >
          <Trash2 size={16} />
          {t('common.delete')}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.fields.name')}
          <input className={focusedFieldClassName(isDark)} value={connector.name} onChange={(event) => onRenameConnector(connector.id, event.target.value)} />
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.fields.driver')}
          <select
            className={fieldClassName(isDark)}
            value={connector.driver}
            onChange={(event) => {
              const nextDriver = event.target.value as VfsDriver;
              onUpdateConnector(connector.id, (prev) => ({
                ...prev,
                driver: nextDriver,
                root: driverUsesSlashRoot(nextDriver)
                  ? (driverUsesSlashRoot(prev.driver) ? prev.root : '/')
                  : prev.root,
                options: normalizeOptionsForDriver(nextDriver, prev.options),
              }));
            }}
          >
            {storageDriverOptions.map((driver) => (
              <option key={driver} value={driver}>
                {t(`admin.config.storage.drivers.${driver}`)}
              </option>
            ))}
          </select>
        </label>

        <label className={cn('text-sm font-black md:col-span-2', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.fields.root')}
          <div className="mt-1 flex items-center gap-2">
            <input
              className={focusedFieldClassName(isDark)}
              value={connector.root}
              placeholder={t(`admin.config.storage.placeholders.root.${connector.driver}`)}
              onChange={(event) => onUpdateConnector(connector.id, (prev) => ({ ...prev, root: event.target.value }))}
            />
            {canPickRoot && (
              <button
                type="button"
                className={cn(
                  'h-10 px-3 rounded-lg border text-sm font-black shrink-0 transition-colors',
                  isDark ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20' : 'border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
                )}
                onClick={() => onPickConnectorRoot(connector.id)}
                disabled={isPickingRoot}
              >
                {isPickingRoot ? t('common.processing') : t('admin.config.storage.actions.pickDirectory')}
              </button>
            )}
          </div>
          <div className={cn('text-xs font-bold mt-1 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {t(`admin.config.storage.hints.root.${connector.driver}`)}
          </div>
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.fields.enabled')}
          <div className="mt-1">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={connector.enable}
              onChange={(event) => onUpdateConnector(connector.id, (prev) => ({ ...prev, enable: event.target.checked }))}
            />
          </div>
        </label>

        <div className="md:col-span-2" />
      </div>

      <ConnectorOptionFields
        connector={connector}
        isDark={isDark}
        onChangeOption={(key, value) => {
          onUpdateConnector(connector.id, (prev) => ({
            ...prev,
            options: upsertOption(prev.options, key, value),
          }));
        }}
      />

      <OptionPairsEditor
        isDark={isDark}
        ownerId={connector.id}
        pairs={connector.options}
        onAdd={() => onUpdateConnector(connector.id, (prev) => ({ ...prev, options: [...prev.options, { key: '', value: '' }] }))}
        onUpdate={(pairIndex, patch) => {
          onUpdateConnector(connector.id, (prev) => {
            const next = prev.options.slice();
            next[pairIndex] = { ...next[pairIndex], ...patch };
            return { ...prev, options: next };
          });
        }}
        onRemove={(pairIndex) => {
          onUpdateConnector(connector.id, (prev) => {
            const next = prev.options.slice();
            next.splice(pairIndex, 1);
            return { ...prev, options: next };
          });
        }}
      />
    </div>
  );
});

ConnectorCard.displayName = 'ConnectorCard';

export const PoolCard = memo(({
  pool,
  index,
  isDark,
  allowDelete,
  connectorNames,
  onRenamePool,
  onUpdatePool,
  onRemovePool,
}: {
  pool: PoolDraft;
  index: number;
  isDark: boolean;
  allowDelete: boolean;
  connectorNames: string[];
  onRenamePool: (id: string, nextName: string) => void;
  onUpdatePool: (id: string, updater: (prev: PoolDraft) => PoolDraft) => void;
  onRemovePool: (id: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'rounded-2xl border p-3 sm:p-4',
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-wide truncate">
            {pool.name || `${t('admin.config.storage.pools.pool')} #${index + 1}`}
          </div>
          <div className={cn('text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {t('admin.config.storage.pools.primary')}: {pool.primary_connector || '-'}
          </div>
        </div>
        <button
          type="button"
          className={dangerButtonClassName(isDark)}
          onClick={() => onRemovePool(pool.id)}
          disabled={!allowDelete}
          title={!allowDelete ? t('admin.config.storage.validation.minimumOnePool') : undefined}
        >
          <Trash2 size={16} />
          {t('common.delete')}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.fields.name')}
          <input className={focusedFieldClassName(isDark)} value={pool.name} onChange={(event) => onRenamePool(pool.id, event.target.value)} />
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.pools.primary')}
          <select className={fieldClassName(isDark)} value={pool.primary_connector} onChange={(event) => onUpdatePool(pool.id, (prev) => ({ ...prev, primary_connector: event.target.value }))}>
            {connectorNames.map((name) => (
              <option key={`${pool.id}-primary-${name}`} value={name}>{name || '(unnamed)'}</option>
            ))}
          </select>
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.pools.backup')}
          <select className={fieldClassName(isDark)} value={pool.backup_connector} onChange={(event) => onUpdatePool(pool.id, (prev) => ({ ...prev, backup_connector: event.target.value }))}>
            <option value="">{t('common.none')}</option>
            {connectorNames.map((name) => (
              <option key={`${pool.id}-backup-${name}`} value={name}>{name || '(unnamed)'}</option>
            ))}
          </select>
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.fields.enabled')}
          <div className="mt-1">
            <input type="checkbox" className="h-5 w-5" checked={pool.enable} onChange={(event) => onUpdatePool(pool.id, (prev) => ({ ...prev, enable: event.target.checked }))} />
          </div>
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.pools.writeCache')}
          <div className="mt-1">
            <input type="checkbox" className="h-5 w-5" checked={pool.enable_write_cache} onChange={(event) => onUpdatePool(pool.id, (prev) => ({ ...prev, enable_write_cache: event.target.checked }))} />
          </div>
        </label>
      </div>

      <OptionPairsEditor
        isDark={isDark}
        ownerId={pool.id}
        pairs={pool.options}
        onAdd={() => onUpdatePool(pool.id, (prev) => ({ ...prev, options: [...prev.options, { key: '', value: '' }] }))}
        onUpdate={(pairIndex, patch) => {
          onUpdatePool(pool.id, (prev) => {
            const next = prev.options.slice();
            next[pairIndex] = { ...next[pairIndex], ...patch };
            return { ...prev, options: next };
          });
        }}
        onRemove={(pairIndex) => {
          onUpdatePool(pool.id, (prev) => {
            const next = prev.options.slice();
            next.splice(pairIndex, 1);
            return { ...prev, options: next };
          });
        }}
      />
    </div>
  );
});

PoolCard.displayName = 'PoolCard';

export const PolicyCard = memo(({
  policy,
  index,
  isDark,
  poolNames,
  onUpdatePolicy,
  onRemovePolicy,
}: {
  policy: PolicyDraft;
  index: number;
  isDark: boolean;
  poolNames: string[];
  onUpdatePolicy: (id: string, updater: (prev: PolicyDraft) => PolicyDraft) => void;
  onRemovePolicy: (id: string) => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'rounded-2xl border p-3 sm:p-4',
      isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-wide truncate">
            {t('admin.config.storage.policies.policy')} #{index + 1}
          </div>
        </div>
        <button type="button" className={dangerButtonClassName(isDark)} onClick={() => onRemovePolicy(policy.id)}>
          <Trash2 size={16} />
          {t('common.delete')}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.policies.roleId')}
          <input className={fieldClassName(isDark)} value={policy.role_id} onChange={(event) => onUpdatePolicy(policy.id, (prev) => ({ ...prev, role_id: event.target.value }))} />
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.policies.poolName')}
          <select className={fieldClassName(isDark)} value={policy.pool_name} onChange={(event) => onUpdatePolicy(policy.id, (prev) => ({ ...prev, pool_name: event.target.value }))}>
            {poolNames.map((name) => (
              <option key={`${policy.id}-${name}`} value={name}>{name || '(unnamed)'}</option>
            ))}
          </select>
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.policies.defaultQuota')}
          <input className={fieldClassName(isDark)} placeholder="0" value={policy.default_quota} onChange={(event) => onUpdatePolicy(policy.id, (prev) => ({ ...prev, default_quota: event.target.value }))} />
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.policies.maxPrivateMounts')}
          <input className={fieldClassName(isDark)} placeholder="0" value={policy.max_private_mounts} onChange={(event) => onUpdatePolicy(policy.id, (prev) => ({ ...prev, max_private_mounts: event.target.value }))} />
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.policies.minMountSyncIntervalMinutes')}
          <input className={fieldClassName(isDark)} placeholder="5" value={policy.min_mount_sync_interval_minutes} onChange={(event) => onUpdatePolicy(policy.id, (prev) => ({ ...prev, min_mount_sync_interval_minutes: event.target.value }))} />
        </label>

        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.policies.maxMountSyncTimeoutSecs')}
          <input className={fieldClassName(isDark)} placeholder="900" value={policy.max_mount_sync_timeout_secs} onChange={(event) => onUpdatePolicy(policy.id, (prev) => ({ ...prev, max_mount_sync_timeout_secs: event.target.value }))} />
        </label>
      </div>
    </div>
  );
});

PolicyCard.displayName = 'PolicyCard';
