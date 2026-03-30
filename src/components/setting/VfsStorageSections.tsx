import { Database, Layers, Plus, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ConnectorCard, ConnectorOptionFields, PolicyCard, PoolCard } from './VfsStorageDraftCards';
import {
  type ActiveTab,
  type ConnectorDraft,
  type PolicyDraft,
  type PoolDraft,
  type VfsDriver,
  driverUsesSlashRoot,
  normalizeOptionsForDriver,
  upsertOption,
} from './vfsStorageDraftShared';
import { canPickRootForDriver } from './vfsStorageDraftModel';

interface VfsStorageMainSectionProps {
  isDark: boolean;
  mainPool: PoolDraft | null;
  mainConnector: ConnectorDraft | null;
  connectors: ConnectorDraft[];
  hasDirectoryPicker: boolean;
  pickingConnectorId: string | null;
  driverLabel: (driver: VfsDriver) => string;
  onOpenAdvanced: () => void;
  onSelectPrimaryConnector: (connectorName: string) => void;
  onRenameConnector: (id: string, nextName: string) => void;
  onUpdateConnector: (id: string, updater: (prev: ConnectorDraft) => ConnectorDraft) => void;
  onPickConnectorRoot: (id: string) => void;
}

interface VfsStorageAdvancedSectionProps {
  isDark: boolean;
  showAllSections: boolean;
  tab: ActiveTab;
  connectors: ConnectorDraft[];
  pools: PoolDraft[];
  policies: PolicyDraft[];
  connectorNames: string[];
  poolNames: string[];
  hasDirectoryPicker: boolean;
  pickingConnectorId: string | null;
  onTabChange: (tab: ActiveTab) => void;
  onAddConnector: () => void;
  onRenameConnector: (id: string, nextName: string) => void;
  onUpdateConnector: (id: string, updater: (prev: ConnectorDraft) => ConnectorDraft) => void;
  onRemoveConnector: (id: string) => void;
  onPickConnectorRoot: (id: string) => void;
  onAddPool: () => void;
  onRenamePool: (id: string, nextName: string) => void;
  onUpdatePool: (id: string, updater: (prev: PoolDraft) => PoolDraft) => void;
  onRemovePool: (id: string) => void;
  onAddPolicy: () => void;
  onUpdatePolicy: (id: string, updater: (prev: PolicyDraft) => PolicyDraft) => void;
  onRemovePolicy: (id: string) => void;
}

export const VfsStorageMainSection: React.FC<VfsStorageMainSectionProps> = ({
  isDark,
  mainPool,
  mainConnector,
  connectors,
  hasDirectoryPicker,
  pickingConnectorId,
  driverLabel,
  onOpenAdvanced,
  onSelectPrimaryConnector,
  onRenameConnector,
  onUpdateConnector,
  onPickConnectorRoot,
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      'rounded-2xl border p-3 sm:p-4',
      isDark ? 'border-white/10 bg-white/[0.02]' : 'border-slate-200 bg-white',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
            {t('admin.config.storage.main.hint')}
          </div>
        </div>
        <button
          type="button"
          className={cn(
            'h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors shrink-0',
            isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
          )}
          onClick={onOpenAdvanced}
        >
          <Settings2 size={16} />
          {t('admin.config.storage.main.openAdvanced')}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
          {t('admin.config.storage.pools.primary')}
          <select
            className={cn(
              'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
              isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
            )}
            value={mainPool?.primary_connector || ''}
            onChange={(event) => onSelectPrimaryConnector(event.target.value)}
          >
            <option value="">{t('common.none')}</option>
            {connectors
              .map((connector) => connector.name.trim())
              .filter((name) => name.length > 0)
              .map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
        </label>

        <div className={cn('text-xs font-bold leading-relaxed self-end opacity-70', isDark ? 'text-slate-400' : 'text-slate-600')}>
          {t('admin.config.storage.main.desc')}
        </div>
      </div>

      {!mainConnector ? (
        <div className={cn(
          'mt-3 rounded-xl border p-3 text-sm font-bold',
          isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700',
        )}>
          {t('admin.config.storage.main.noPrimaryConnector')}
        </div>
      ) : (
        <div className={cn(
          'mt-3 rounded-2xl border p-3 sm:p-4',
          isDark ? 'border-white/10 bg-white/[0.03]' : 'border-slate-200 bg-white',
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-black uppercase tracking-wide truncate">
                {mainConnector.name || t('admin.config.storage.connectors.connector')}
              </div>
              <div className={cn('text-xs font-bold uppercase tracking-widest mt-0.5 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {driverLabel(mainConnector.driver)}
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={cn('text-sm font-black md:col-span-2', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {t('admin.config.storage.fields.name')}
              <input
                className={cn(
                  'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                  isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                )}
                value={mainConnector.name}
                onChange={(event) => onRenameConnector(mainConnector.id, event.target.value)}
              />
            </label>

            <label className={cn('text-sm font-black md:col-span-2', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {t('admin.config.storage.fields.driver')}
              <select
                className={cn(
                  'mt-1 w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold',
                  isDark ? 'border-white/15 bg-black/30 text-white' : 'border-slate-300 bg-white text-slate-900',
                )}
                value={mainConnector.driver}
                onChange={(event) => {
                  const nextDriver = event.target.value as VfsDriver;
                  onUpdateConnector(mainConnector.id, (prev) => ({
                    ...prev,
                    driver: nextDriver,
                    root: driverUsesSlashRoot(nextDriver)
                      ? (driverUsesSlashRoot(prev.driver) ? prev.root : '/')
                      : prev.root,
                    options: normalizeOptionsForDriver(nextDriver, prev.options),
                  }));
                }}
              >
                {(['fs', 's3', 'webdav', 'dropbox', 'onedrive', 'gdrive', 'memory', 'android_saf', 'ios_scoped_fs'] as VfsDriver[]).map((driver) => (
                  <option key={driver} value={driver}>
                    {driverLabel(driver)}
                  </option>
                ))}
              </select>
            </label>

            <label className={cn('text-sm font-black md:col-span-2', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {t('admin.config.storage.fields.root')}
              <div className="mt-1 flex items-center gap-2">
                <input
                  className={cn(
                    'w-full h-10 rounded-lg border px-3 text-sm font-mono font-bold focus:outline-none focus:ring-2',
                    isDark ? 'border-white/15 bg-black/30 text-white focus:ring-cyan-500/30' : 'border-slate-300 bg-white text-slate-900 focus:ring-cyan-500/20 shadow-sm',
                  )}
                  value={mainConnector.root}
                  placeholder={t(`admin.config.storage.placeholders.root.${mainConnector.driver}`)}
                  onChange={(event) => onUpdateConnector(mainConnector.id, (prev) => ({ ...prev, root: event.target.value }))}
                />
                {canPickRootForDriver(mainConnector.driver, hasDirectoryPicker) && (
                  <button
                    type="button"
                    className={cn(
                      'h-10 px-3 rounded-lg border text-sm font-black shrink-0 transition-colors',
                      isDark ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20' : 'border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100',
                    )}
                    onClick={() => onPickConnectorRoot(mainConnector.id)}
                    disabled={pickingConnectorId === mainConnector.id}
                  >
                    {pickingConnectorId === mainConnector.id ? t('common.processing') : t('admin.config.storage.actions.pickDirectory')}
                  </button>
                )}
              </div>
              <div className={cn('text-xs font-bold mt-1 opacity-60', isDark ? 'text-slate-400' : 'text-slate-500')}>
                {t(`admin.config.storage.hints.root.${mainConnector.driver}`)}
              </div>
            </label>

            <label className={cn('text-sm font-black', isDark ? 'text-slate-300' : 'text-slate-700')}>
              {t('admin.config.storage.fields.enabled')}
              <div className="mt-1">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={mainConnector.enable}
                  onChange={(event) => onUpdateConnector(mainConnector.id, (prev) => ({ ...prev, enable: event.target.checked }))}
                />
              </div>
            </label>

            <div className="md:col-span-2" />
          </div>

          <ConnectorOptionFields
            connector={mainConnector}
            isDark={isDark}
            onChangeOption={(key, value) => {
              onUpdateConnector(mainConnector.id, (prev) => ({
                ...prev,
                options: upsertOption(prev.options, key, value),
              }));
            }}
          />
        </div>
      )}
    </div>
  );
};

export const VfsStorageAdvancedSection: React.FC<VfsStorageAdvancedSectionProps> = ({
  isDark,
  showAllSections,
  tab,
  connectors,
  pools,
  policies,
  connectorNames,
  poolNames,
  hasDirectoryPicker,
  pickingConnectorId,
  onTabChange,
  onAddConnector,
  onRenameConnector,
  onUpdateConnector,
  onRemoveConnector,
  onPickConnectorRoot,
  onAddPool,
  onRenamePool,
  onUpdatePool,
  onRemovePool,
  onAddPolicy,
  onUpdatePolicy,
  onRemovePolicy,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {!showAllSections && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { value: 'pools', icon: Layers, label: t('admin.config.storage.tabs.pools') },
            { value: 'connectors', icon: Database, label: t('admin.config.storage.tabs.connectors') },
            { value: 'policies', icon: Layers, label: t('admin.config.storage.tabs.policies') },
          ] as const).map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              type="button"
              className={cn(
                'h-10 rounded-lg text-sm font-black border transition-colors shadow-sm inline-flex items-center justify-center gap-2',
                tab === value
                  ? 'bg-primary text-white border-primary'
                  : isDark ? 'bg-black/20 text-slate-300 border-white/10 hover:bg-white/10' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50',
              )}
              onClick={() => onTabChange(value)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      )}

      {(showAllSections || tab === 'connectors') && (
        <div className="space-y-3">
          {showAllSections && <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.connectors')}</div>}
          <div className="flex items-center justify-between">
            <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
              {t('admin.config.storage.connectors.title')}
            </div>
            <button type="button" className={cn('h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors', isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50')} onClick={onAddConnector}>
              <Plus size={16} />
              {t('admin.config.storage.actions.addConnector')}
            </button>
          </div>

          {connectors.map((connector, index) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              index={index}
              isDark={isDark}
              allowDelete={connectors.length > 1}
              canPickRoot={canPickRootForDriver(connector.driver, hasDirectoryPicker)}
              isPickingRoot={pickingConnectorId === connector.id}
              onRenameConnector={onRenameConnector}
              onUpdateConnector={onUpdateConnector}
              onRemoveConnector={onRemoveConnector}
              onPickConnectorRoot={onPickConnectorRoot}
            />
          ))}
        </div>
      )}

      {(showAllSections || tab === 'pools') && (
        <div className="space-y-3">
          {showAllSections && <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.pools')}</div>}
          <div className="flex items-center justify-between">
            <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
              {t('admin.config.storage.pools.title')}
            </div>
            <button type="button" className={cn('h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors', isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50')} onClick={onAddPool}>
              <Plus size={16} />
              {t('admin.config.storage.actions.addPool')}
            </button>
          </div>

          {pools.map((pool, index) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              index={index}
              isDark={isDark}
              allowDelete={pools.length > 1}
              connectorNames={connectorNames}
              onRenamePool={onRenamePool}
              onUpdatePool={onUpdatePool}
              onRemovePool={onRemovePool}
            />
          ))}
        </div>
      )}

      {(showAllSections || tab === 'policies') && (
        <div className="space-y-3">
          {showAllSections && <div className={cn('text-sm font-black uppercase tracking-wide', isDark ? 'text-slate-100' : 'text-slate-900')}>{t('admin.config.storage.sections.policies')}</div>}
          <div className="flex items-center justify-between">
            <div className={cn('text-xs font-black uppercase tracking-widest opacity-60', isDark ? 'text-slate-300' : 'text-slate-600')}>
              {t('admin.config.storage.policies.title')}
            </div>
            <button type="button" className={cn('h-9 px-3 rounded-lg border text-sm font-black inline-flex items-center gap-2 transition-colors', isDark ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10' : 'border-slate-300 bg-white text-slate-900 hover:bg-slate-50')} onClick={onAddPolicy}>
              <Plus size={16} />
              {t('admin.config.storage.actions.addPolicy')}
            </button>
          </div>

          <div className={cn('text-sm font-bold opacity-70', isDark ? 'text-slate-400' : 'text-slate-600')}>
            {t('admin.config.storage.policies.hint')}
          </div>

          {policies.length === 0 && (
            <div className={cn('rounded-xl border p-3', isDark ? 'border-white/10 bg-black/20 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700')}>
              {t('admin.config.storage.policies.empty')}
            </div>
          )}

          {policies.map((policy, index) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              index={index}
              isDark={isDark}
              poolNames={poolNames}
              onUpdatePolicy={onUpdatePolicy}
              onRemovePolicy={onRemovePolicy}
            />
          ))}
        </div>
      )}
    </>
  );
};
