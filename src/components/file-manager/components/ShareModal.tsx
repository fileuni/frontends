import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { useToastStore } from '@/stores/toast';
import { Modal } from '@/components/ui/Modal.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { PasswordInput } from '@/components/common/PasswordInput.tsx';
import { Link as LinkIcon, Copy, CheckCircle2, Lock, Clock, Dices, Download, Zap, Settings, Info, User, QrCode, X, Upload, FilePenLine, Trash2 } from 'lucide-react';
import type { FileInfo } from '../types/index.ts';
import { client, extractData } from '@/lib/api.ts';
import { useThemeStore } from '@/stores/theme';
import { cn } from '@/lib/utils.ts';
import { useFileActions } from '../hooks/useFileActions.ts';
import { QRCodeSVG } from 'qrcode.react';
import { copyTextWithToast, showApiErrorToast } from '@/lib/feedback.ts';
import {
  buildDirectShareUrl,
  buildShareClipboardText,
  buildShareCreateBody,
  buildShareHashUrl,
  buildShareUpdateBody,
  createEditingShareForm,
  createNewShareForm,
  currentShareHasPassword,
  EMPTY_SHARE_FORM,
  formatShareDateForInput,
  hasVisibleSharePassword,
  isDirectSharePathAllowed,
  type ShareFormState,
} from '../utils/shareHelpers.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  file: FileInfo | null;
}

export const ShareModal = ({ isOpen, onClose, file }: Props) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const { theme } = useThemeStore();
  const { loadFiles } = useFileActions();
  const [loading, setLoading] = useState(false);
  const [completedShareId, setCompletedShareId] = useState<string | null>(null);
  
  const [mainTab, setMainTab] = useState<'view' | 'edit'>('view');
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [showQr, setShowQr] = useState(false);
  
  const isEditing = !!(file && file.id && file.view_count !== undefined);

  const [form, setForm] = useState<ShareFormState>(EMPTY_SHARE_FORM);

  useEffect(() => {
    if (isOpen && isEditing && file) {
      const nextForm = createEditingShareForm(file);
      if (!file.is_dir && !isDirectSharePathAllowed(file.path)) {
        nextForm.enableDirect = false;
      }
      setForm(nextForm);
      setMainTab('view');
    } else if (isOpen && !isEditing) {
      setForm(createNewShareForm());
      setMainTab('edit');
    }
    setCompletedShareId(null);
    setActiveTab('basic');
    setShowQr(false);
  }, [isOpen, isEditing, file]);

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleDirect = () => {
    if (file && !file.is_dir && !isDirectSharePathAllowed(file.path)) {
      return;
    }
    setForm(prev => ({ ...prev, enableDirect: !prev.enableDirect }));
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, password: result, passwordMode: 'change' }));
  };

  const setQuickPassword = (pwd: string) => {
    setForm(prev => ({ ...prev, password: pwd, passwordMode: 'change' }));
  };

  const setExpireByDays = (days: number) => {
    if (days === 0) {
      setForm({ ...form, expireDate: '' });
      return;
    }
    const date = new Date();
    date.setDate(date.getDate() + days);
    setForm({ ...form, expireDate: formatShareDateForInput(date) });
  };

  const handleCreateShare = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const shareResult = await extractData<{ id: string }>(client.POST('/api/v1/file/shares/create', {
        body: buildShareCreateBody(file, form),
      }));
      setCompletedShareId(shareResult.id);
      addToast(t('filemanager.shareModal.successTitle'), 'success');
      void loadFiles();
      setMainTab('view');
    } catch (error: unknown) {
      showApiErrorToast(addToast, t, error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateShare = async () => {
    if (!file || !file.id) return;
    setLoading(true);
    try {
      await extractData(client.PATCH('/api/v1/file/shares/{id}', {
        params: { path: { id: file.id } },
        body: buildShareUpdateBody(file, form),
      }));

      addToast(t('filemanager.shareModal.successTitle'), 'success');
      void loadFiles();
      setCompletedShareId(file.id);
      setMainTab('view');
    } catch (error: unknown) {
      showApiErrorToast(addToast, t, error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCompletedShareId(null);
    setForm(EMPTY_SHARE_FORM);
    onClose();
  };

  const handleDeleteShare = async () => {
    if (!file?.id) return;
    setLoading(true);
    try {
      await extractData(client.DELETE('/api/v1/file/shares/{id}', {
        params: { path: { id: file.id } },
      }));
      addToast(t('filemanager.shareModal.cancelShareBtn'), 'success');
      void loadFiles();
      handleClose();
    } catch (error: unknown) {
      showApiErrorToast(addToast, t, error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await copyTextWithToast({
      text,
      addToast,
      t,
      successMessage: t('filemanager.shareModal.copySuccess'),
    });
  };

  const shareId = completedShareId || (isEditing ? file?.id || null : null);
  const shareUrl = shareId ? buildShareHashUrl(shareId) : '';
  const directUrl = shareId ? buildDirectShareUrl(shareId) : '';
  const directEligible = !file || file.is_dir || isDirectSharePathAllowed(file.path);
  const hasVisiblePassword = hasVisibleSharePassword(form, isEditing);
  const hasCurrentPassword = currentShareHasPassword(form, file);
  const directEnabled = directEligible && (form.enableDirect || file?.enable_direct === true);
  const combinedAllInfo = useMemo(
    () => buildShareClipboardText({
      labels: {
        title: t('filemanager.shareModal.copyFormat.title'),
        file: t('filemanager.shareModal.copyFormat.file'),
        link: t('filemanager.shareModal.copyFormat.link'),
        password: t('filemanager.shareModal.copyFormat.password'),
        existingPassword: t('filemanager.shareModal.copyFormat.existingPassword'),
        directTitle: t('filemanager.shareModal.copyFormat.directTitle'),
        directUrl: t('filemanager.shareModal.copyFormat.url'),
        directUser: t('filemanager.shareModal.copyFormat.user'),
        directPass: t('filemanager.shareModal.copyFormat.pass'),
        directUserHint: t('filemanager.shareModal.copyFormat.userHint'),
      },
      fileName: file?.name || '',
      shareUrl,
      directUrl,
      password: form.password,
      hasVisiblePassword,
      hasExistingPassword: Boolean(file?.has_password && form.passwordMode === 'keep'),
      directEnabled,
    }),
    [directEnabled, directUrl, file?.has_password, file?.name, form.password, form.passwordMode, hasVisiblePassword, shareUrl, t],
  );

  const PresetTag = ({ label, days }: { label: string, days: number }) => (
    <button
      type="button"
      onClick={() => setExpireByDays(days)}
      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[14px] font-black tracking-tighter opacity-60 hover:opacity-100 hover:bg-primary/20 hover:text-primary transition-all"
    >
      {label}
    </button>
  );

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={isEditing ? t('filemanager.shareModal.viewEditTitle') : t('filemanager.shareModal.title')} 
      maxWidth="max-w-md"
      bodyClassName="p-0"
    >
      <div className="flex flex-col h-full" data-testid="share-modal">
        {isEditing && (
          <div className="flex border-b border-white/5 bg-black/20 shrink-0">
            <button 
              type="button"
              onClick={() => setMainTab('view')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black tracking-[0.2em] transition-all border-b-2",
                mainTab === 'view' ? "border-primary text-primary bg-primary/5" : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              <Info size={18} /> {t('filemanager.shareModal.viewTab')}
            </button>
            <button 
              type="button"
              onClick={() => setMainTab('edit')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-black tracking-[0.2em] transition-all border-b-2",
                mainTab === 'edit' ? "border-primary text-primary bg-primary/5" : "border-transparent opacity-40 hover:opacity-100"
              )}
            >
              <Settings size={18} /> {t('filemanager.shareModal.editTab')}
            </button>
          </div>
        )}

        {mainTab === 'view' ? (
          <div className="p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {completedShareId && (
              <div className="flex flex-col items-center text-center space-y-1 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={20} />
                </div>
                <h4 className="text-base font-black tracking-tight text-green-500">{t('filemanager.shareModal.successTitle')}</h4>
              </div>
            )}

            <div className="space-y-3">
              <div className={cn(
                "rounded-2xl border overflow-hidden transition-all flex flex-col",
                isDark ? "bg-black/20 border-white/5" : "bg-gray-50 border-gray-100"
              )}>
                {/* Header with QR Toggle */}
                <div className="p-3 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <LinkIcon size={18} className="text-primary" />
                    <span className="text-[14px] font-black opacity-40 tracking-widest">{t('filemanager.shareModal.sharePackage')}</span>
                  </div>
                    <button
                      type="button"
                      data-testid="share-toggle-qr"
                      onClick={() => setShowQr(!showQr)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      showQr ? "bg-red-500 text-white shadow-lg hover:bg-red-600" : "bg-white/5 opacity-40 hover:opacity-100"
                    )}
                    title={showQr ? t('filemanager.shareModal.hideQrCode') : t('filemanager.shareModal.showQrCode')}
                  >
                    {showQr ? <X size={18} /> : <QrCode size={18} />}
                  </button>
                </div>

                {showQr ? (
                  <div className="p-6 flex flex-col items-center justify-center bg-white space-y-3 animate-in zoom-in-95 duration-300">
                    <QRCodeSVG 
                      value={combinedAllInfo} 
                      size={140}
                      level="H"
                    />
                    <p className="text-[14px] font-black text-black/40 tracking-widest">{t('filemanager.shareModal.qrDesc')}</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] font-black opacity-40 tracking-widest">{t('filemanager.shareModal.shareUrlLabel')}</span>
                        {hasCurrentPassword && (
                          <div className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[14px] font-black border border-yellow-500/20">
                            <Lock size={10} className="inline mr-1" /> {t('filemanager.shareModal.protected')}
                          </div>
                        )}
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono text-sm text-primary/80 break-all leading-relaxed shadow-inner">
                        {shareUrl}
                      </div>
                    </div>

                    {(form.passwordMode === 'change' || (!isEditing && form.password)) && form.password && (
                      <div className="px-4 py-2 bg-yellow-500/5 border-y border-yellow-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Lock size={18} className="text-yellow-500" />
                          <div className="flex flex-col">
                            <span className="text-[14px] font-black opacity-40 leading-none mb-1">{t('filemanager.shareModal.accessPasswordLabel')}</span>
                            <span className="text-sm font-mono font-black text-yellow-500 tracking-wider">{form.password}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {directEnabled && (
                      <div className="p-3 bg-primary/5 border-t border-white/5 space-y-3">
                        <div className="flex items-center gap-2">
                          <Zap size={18} className="text-yellow-500" />
                          <span className="text-[14px] font-black opacity-40 tracking-[0.2em]">{t('filemanager.shareModal.directLinkTitle')}</span>
                        </div>
                        <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 font-mono text-sm text-primary/60 break-all leading-relaxed shadow-inner">
                          {directUrl}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <span className="flex items-center gap-1.5 text-[14px] font-black opacity-40"><User size={10} /> {t('filemanager.shareModal.directUser')}</span>
                            <div className="bg-black/20 p-2 rounded-lg font-mono text-sm text-center border border-white/5 opacity-80 text-primary">fileuni</div>
                            <p className="text-[14px] opacity-50 font-medium">{t('filemanager.shareModal.directUserHint')}</p>
                          </div>
                          {hasCurrentPassword && (
                            <div className="space-y-1">
                              <span className="flex items-center gap-1.5 text-[14px] font-black opacity-40"><Lock size={10} /> {t('filemanager.shareModal.directPass')}</span>
                              <div className="bg-black/20 p-2 rounded-lg font-mono text-sm text-center border border-white/5 truncate opacity-80 text-yellow-500">
                                {(form.passwordMode === 'change' || !isEditing) && form.password ? form.password : '********'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button 
                  type="button"
                  data-testid="share-copy-info"
                  onClick={() => { void copyToClipboard(combinedAllInfo); }}
                  className="w-full py-3 bg-primary text-white text-sm font-black tracking-[0.2em] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Copy size={18} /> {hasCurrentPassword || directEnabled ? t('filemanager.shareModal.copyAllInfo') : t('filemanager.shareModal.copyLink')}
                </button>
              </div>
            </div>

            <Button variant="ghost" className="w-full h-10 rounded-xl text-sm font-black tracking-widest opacity-40 hover:opacity-100" onClick={handleClose}>
              {t('filemanager.shareModal.done')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex border-b border-white/5 px-4">
              <button type="button" onClick={() => setActiveTab('basic')} className={cn("px-4 py-2.5 text-[14px] font-black tracking-widest transition-all border-b-2", activeTab === 'basic' ? "border-primary text-primary" : "border-transparent opacity-40 hover:opacity-100")}>{t('filemanager.shareModal.basicTab')}</button>
              <button type="button" onClick={() => setActiveTab('advanced')} className={cn("px-4 py-2.5 text-[14px] font-black tracking-widest transition-all border-b-2", activeTab === 'advanced' ? "border-primary text-primary" : "border-transparent opacity-40 hover:opacity-100")}>{t('filemanager.shareModal.advancedTab')}</button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
              {activeTab === 'basic' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-2 duration-200">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[14px] font-black tracking-widest opacity-40 flex items-center gap-2"><Clock size={10} /> {t('filemanager.shareModal.expirationLabel')}</div>
                      <div className="flex items-center gap-1">
                        <PresetTag label="24h" days={1} /><PresetTag label="7D" days={7} /><PresetTag label="30D" days={30} /><PresetTag label="∞" days={0} />
                      </div>
                    </div>
                    <div className="relative group">
                      <Input type="datetime-local" value={form.expireDate} onChange={e => setForm({...form, expireDate: e.target.value})} className="h-9 text-sm font-mono" />
                      {!form.expireDate && <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"><span className="text-[14px] font-black tracking-widest">{t('filemanager.shareModal.expirePermanent')}</span></div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                      <div className="text-[14px] font-black tracking-widest opacity-40 ml-1 flex items-center gap-2"><Lock size={10} /> {t('filemanager.shareModal.passwordLabel')}</div>
                    {isEditing && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['keep', 'remove', 'change'] as const).map((mode) => (
                          <button key={mode} type="button" onClick={() => setForm({...form, passwordMode: mode})} className={cn("min-h-10 rounded-xl text-sm font-black transition-all border px-3 text-center", form.passwordMode === mode ? (mode === 'remove' ? "bg-red-500/20 border-red-500/50 text-red-500" : mode === 'change' ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-primary/15 border-primary/40 text-primary") : "bg-white/5 border-white/10 opacity-70 hover:opacity-100")}>{mode === 'keep' ? t('filemanager.shareModal.keepOldPassword') : mode === 'remove' ? t('filemanager.shareModal.removePassword') : t('filemanager.shareModal.changePassword')}</button>
                        ))}
                      </div>
                    )}
                    {(form.passwordMode === 'change' || !isEditing) && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        {isEditing && <p className="text-[14px] text-yellow-500 font-bold bg-yellow-500/5 p-1.5 rounded-lg leading-relaxed italic border border-yellow-500/10">{t('filemanager.shareModal.passwordChangeWarning')}</p>}
                        <PasswordInput
                          defaultVisible
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value, passwordMode: 'change' })}
                          data-testid="share-password"
                          placeholder={t('filemanager.shareModal.passwordPlaceholder')}
                          inputClassName="h-9 text-sm"
                        />
                        <div className="flex flex-wrap items-center gap-1">
                          <button type="button" onClick={generateRandomPassword} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[14px] font-black bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 transition-all"><Dices size={10} className="text-primary" /> {t('filemanager.shareModal.randomPassword')}</button>
                          <div className="flex items-center gap-1 px-1">{['1111', '1234', '8888'].map(pwd => (<button key={pwd} type="button" onClick={() => setQuickPassword(pwd)} className="px-1.5 py-0.5 rounded-md text-[14px] font-black opacity-40 hover:opacity-100 hover:bg-white/5 transition-all">{pwd}</button>))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {file?.is_dir && (
                    <div className="space-y-2">
                      <div className="text-[14px] font-black tracking-widest opacity-40 ml-1">{t('filemanager.shareModal.writePermissionsLabel')}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, canUpload: !prev.canUpload }))}
                          className={cn(
                            "min-h-10 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 px-3",
                            form.canUpload ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 opacity-50 hover:opacity-100"
                          )}
                        >
                          <Upload size={18} /> {t('filemanager.shareModal.permissionUpload')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, canUpdateNoCreate: !prev.canUpdateNoCreate }))}
                          className={cn(
                            "min-h-10 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 px-3",
                            form.canUpdateNoCreate ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 opacity-50 hover:opacity-100"
                          )}
                        >
                          <FilePenLine size={18} /> {t('filemanager.shareModal.permissionUpdateNoCreate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, canDelete: !prev.canDelete }))}
                          className={cn(
                            "min-h-10 rounded-xl border text-sm font-black transition-all flex items-center justify-center gap-2 px-3",
                            form.canDelete ? "bg-red-500/20 border-red-500 text-red-500" : "bg-white/5 border-white/5 opacity-50 hover:opacity-100"
                          )}
                        >
                          <Trash2 size={18} /> {t('filemanager.shareModal.permissionDelete')}
                        </button>
                      </div>
                      <p className="text-[14px] opacity-50 font-medium px-1">{form.canUpload || form.canUpdateNoCreate || form.canDelete ? t('filemanager.shareModal.writePermissionsEnabledHint') : t('filemanager.shareModal.writePermissionsDisabledHint')}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
                  <div className="space-y-2">
                    <div className="text-[14px] font-black tracking-widest opacity-40 ml-1 flex items-center gap-2"><Download size={10} /> {t('filemanager.shareModal.maxDownloadsLabel')}</div>
                    <div className="flex items-center gap-2">
                      <Input type="number" min={0} value={form.maxDownloads} onChange={e => setForm({ ...form, maxDownloads: parseInt(e.target.value) || 0 })} className="h-9 text-sm font-bold w-20" />
                      <button type="button" onClick={() => setForm({ ...form, maxDownloads: 0 })} className={cn("flex-1 h-9 rounded-xl border font-bold text-sm transition-all", form.maxDownloads === 0 ? "bg-primary border-primary text-white" : "bg-white/5 border-white/5 opacity-40")}>{t('filemanager.shareModal.unlimited')}</button>
                    </div>
                  </div>
                    <div className={cn("flex items-center justify-between p-2.5 rounded-xl border transition-all", form.enableDirect ? "bg-yellow-500/10 border-yellow-500/20" : "bg-white/5 border-white/5")} data-testid="share-direct-section">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Zap size={18} className={form.enableDirect ? "text-yellow-500" : "opacity-40"} />
                        <p className="text-[14px] font-black tracking-widest">{t('filemanager.shareModal.enableDirectLabel')}</p>
                      </div>
                      <p className="text-[14px] opacity-40 font-medium max-w-[180px]">{t('filemanager.shareModal.enableDirectDesc')}</p>
                      {!directEligible && (
                        <p className="text-[14px] text-yellow-500/80 font-medium max-w-[240px]">
                          {t('filemanager.shareModal.directRestrictedHint')}
                        </p>
                      )}
                    </div>
                    <button type="button" data-testid="share-toggle-direct" onClick={toggleDirect} disabled={!directEligible} className={cn("w-9 h-4.5 rounded-full relative transition-all duration-300 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed", form.enableDirect ? "bg-yellow-500 shadow-md shadow-yellow-500/20" : "bg-zinc-600")}>
                      <div className={cn("absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm", form.enableDirect ? "left-5" : "left-0.5")} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 pt-0 border-t border-white/5 bg-white/[0.01] shrink-0">
                <Button className="w-full h-11 rounded-xl text-sm font-black tracking-widest shadow-lg shadow-primary/20" data-testid="share-submit" onClick={isEditing ? handleUpdateShare : handleCreateShare} disabled={loading}>
                  {loading ? <span className="loading-spinner animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> : isEditing ? t('filemanager.shareModal.updateBtn') : t('filemanager.shareModal.generateBtn')}
                </Button>
              {isEditing && file?.id && (
                <Button variant="outline" className="mt-3 w-full h-10 rounded-xl text-sm font-black tracking-widest border-red-500/30 text-red-500 hover:bg-red-500/10" onClick={handleDeleteShare} disabled={loading}>
                  {t('filemanager.shareModal.cancelShareBtn')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
