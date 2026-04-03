import React, { useMemo, useState, useEffect, useContext } from 'react';
import { AboutModal, buildAboutUpdateGuideUrl, type AboutUpdateInfo } from '@/components/modals/AboutModal';
import { useThemeStore, type Theme } from '@/stores/theme';
import { useLanguageStore, type Language } from '@/stores/language';
import { useAuthStore } from '@/stores/auth.ts';
import { useAuthzStore } from '@/stores/authz.ts';
import { useConfigStore } from '@/stores/config.ts';
import { useNavigationStore } from '@/stores/navigation.ts';
import { useTranslation } from 'react-i18next';
import { 
  Sun, Moon, Laptop, LayoutDashboard, FolderOpen, 
  ShieldAlert, LogIn, UserPlus, Home, Menu, X, LogOut,
  Users, MessageSquare, Info
} from 'lucide-react';
import { cn } from '@/lib/utils.ts';
import { StatusIndicator } from './StatusIndicator.tsx';
import { ThemeLanguageControls } from './ThemeLanguageControls.tsx';
import { ChatContext } from '@/components/chat/context/ChatContext';
import { checkLatestReleaseApi, fetchRuntimeVersionApi } from './about/api.ts';

const getLanguageLabel = (t: ReturnType<typeof useTranslation>['t'], language: Language): string => {
  switch (language) {
    case 'auto':
      return t('languages.auto');
    case 'en':
      return t('languages.en');
    case 'zh-cn':
      return t('languages.zh-cn');
    case 'es':
      return t('languages.es');
    case 'de':
      return t('languages.de');
    case 'fr':
      return t('languages.fr');
    case 'ru':
      return t('languages.ru');
    case 'ja':
      return t('languages.ja');
    default:
      return language;
  }
};

const getThemeLabel = (t: ReturnType<typeof useTranslation>['t'], theme: Theme): string => {
  switch (theme) {
    case 'system':
      return t('themes.system');
    case 'light':
      return t('themes.light');
    case 'dark':
      return t('themes.dark');
    default:
      return theme;
  }
};


export const Navbar = () => {
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const { currentUserData, isLoggedIn, logout } = useAuthStore();
  const { hasPermission } = useAuthzStore();
  const { capabilities, fetchCapabilities } = useConfigStore();
  const { t } = useTranslation();
  
  const chat = useContext(ChatContext);
  const setChatOpen = chat?.setIsOpen ?? null;
  const isChatActive = chat?.isOpen ?? false;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutVersion, setAboutVersion] = useState('');
  const [aboutUpdateInfo, setAboutUpdateInfo] = useState<AboutUpdateInfo | null>(null);
  const [aboutUpdateError, setAboutUpdateError] = useState<string | null>(null);
  const [isCheckingAboutUpdates, setIsCheckingAboutUpdates] = useState(false);

  const { params } = useNavigationStore();
  const base = '#';

  useEffect(() => {
    setMounted(true);
    fetchCapabilities();
    void fetchRuntimeVersionApi()
      .then((payload) => setAboutVersion(payload.version))
      .catch((error) => {
        console.error('Failed to fetch runtime version', error);
      });
  }, [fetchCapabilities]);

  useEffect(() => {
    const handleOpenAboutEvent = () => {
      setIsAboutOpen(true);
      setAboutUpdateError(null);
    };

    window.addEventListener('fileuni:open-about', handleOpenAboutEvent);
    return () => window.removeEventListener('fileuni:open-about', handleOpenAboutEvent);
  }, []);

  const mod = params.mod || 'public';
  const page = params.page || 'index';
  const canAccessAdmin = hasPermission("admin.access");
  const canUseChat = hasPermission("feature.chat.use") && capabilities?.enable_chat !== false;
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const updateGuideBaseUrl = language === 'en' ? 'https://fileuni.com/update' : 'https://fileuni.com/zh-cn/update';

  const navItems = useMemo(() => {
    if (capabilities?.is_config_set_mode) return []; // Config-set mode: hide nav links

    const items = [];
    items.push({ name: t('nav.backToPublic'), icon: Home, path: `${base}mod=public&page=index`, active: mod === 'public' && page === 'index' });

    if (!isLoggedIn) {
      items.push({ name: t('common.login'), icon: LogIn, path: `${base}mod=public&page=login`, active: mod === 'public' && page === 'login' });
      if (capabilities?.enable_registration !== false) {
        items.push({ name: t('common.register'), icon: UserPlus, path: `${base}mod=public&page=register`, active: mod === 'public' && page === 'register' });
      }
    } else {
      items.push({ name: t('nav.dashboard'), icon: LayoutDashboard, path: `${base}mod=user&page=welcome`, active: mod === 'user' });
      // Check if file manager API is enabled
      if (capabilities?.enable_api !== false) {
        items.push({ name: t('nav.filemanager'), icon: FolderOpen, path: `${base}mod=file-manager`, active: mod === 'file-manager' });
      }
      if (canAccessAdmin) {
        items.push({
          name: t('nav.adminPanel'),
          icon: ShieldAlert,
          path: `${base}mod=admin`,
          active: mod === 'admin',
          className: "text-red-500"
        });
      }

      // Add unified chat entry
      if (setChatOpen && canUseChat) {
        items.push({
          name: t('chat.title', { defaultValue: 'Chat' }),
          icon: MessageSquare,
          onClick: () => { setChatOpen(true); setIsMenuOpen(false); },
          active: isChatActive
        });
      }
    }
    return items;
  }, [isLoggedIn, canAccessAdmin, canUseChat, mod, page, t, capabilities, setChatOpen, isChatActive]);

  if (!mounted) return null;

  const handleLogout = () => {
    logout();
    window.location.hash = `mod=public&page=login`;
  };

  const handleOpenAbout = () => {
    setIsMenuOpen(false);
    setIsAboutOpen(true);
    setAboutUpdateError(null);
  };

  const handleCheckAboutUpdates = async () => {
    setIsCheckingAboutUpdates(true);
    setAboutUpdateError(null);
    try {
      const payload = await checkLatestReleaseApi();
      setAboutUpdateInfo(payload);
    } catch (error) {
      console.error('Failed to check latest release', error);
      setAboutUpdateError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsCheckingAboutUpdates(false);
    }
  };

  return (
    <>
      <nav className={cn(
        "fixed top-0 left-0 right-0 h-16 border-b backdrop-blur-md z-[100] flex items-center justify-between px-4 md:px-8",
        isDark ? "border-white/5 bg-zinc-950/80" : "border-gray-200 bg-white/80"
      )}>
        {/* Brand */}
        <a href={`${base}mod=public&page=index`} className="flex items-center gap-3 group shrink-0">
						<img src="/favicon.svg" alt={t('common.logoAlt')} width={36} height={36} className="shadow-lg rounded-xl" />
          <span className={cn("font-black text-lg tracking-tight hidden sm:block", isDark ? "text-white" : "text-gray-900")}>{t('common.brandName')}</span>
        </a>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {isLoggedIn && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-black text-sm">
                {currentUserData?.user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-black opacity-70">{currentUserData?.user.username}</span>
            </div>
          )}
          
          {isLoggedIn && <StatusIndicator isDark={isDark} />}

          {/* Quick toggles (always visible) */}
          <ThemeLanguageControls />
           
          <button 
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "p-2 rounded-xl text-primary border transition-all",
              isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-gray-100 border-gray-200 hover:bg-gray-200"
            )}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        currentVersion={aboutVersion}
        showCheckUpdates={canAccessAdmin}
        isCheckingUpdates={isCheckingAboutUpdates}
        updateInfo={aboutUpdateInfo}
        updateError={aboutUpdateError}
        onCheckUpdates={canAccessAdmin ? handleCheckAboutUpdates : undefined}
        getUpdateGuideUrl={(info, updateInfo) =>
          buildAboutUpdateGuideUrl(updateGuideBaseUrl, info, updateInfo)
        }
      />

      {/* Unified Dropdown Menu */}
      {isMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[100]"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className={cn(
            "fixed top-16 right-0 z-[110] w-full md:w-80 h-[calc(100vh-4rem)] overflow-y-auto animate-in slide-in-from-right-2 duration-200 shadow-2xl border-l",
            isDark ? "bg-zinc-950 border-white/5" : "bg-white border-gray-100"
          )}>
            <div className="p-6 space-y-8">
              {/* Active User (Top) */}
              {isLoggedIn && (
                <div className="flex items-center gap-4 p-4 rounded-[2rem] bg-primary/10 border border-primary/20 relative group">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-primary/20 shrink-0">
                    {currentUserData?.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-lg truncate leading-tight">{currentUserData?.user.username}</p>
                    <p className="text-sm font-black uppercase opacity-40 tracking-widest">{t('nav.activeWorkspace')}</p>
                  </div>
                  
                  <div className="divider divider-horizontal mx-0 h-8 border-primary/20" />
                  
                  <a 
                    href={`#mod=user&page=accounts&redirect=${encodeURIComponent(window.location.hash)}`}
                    className="p-2 rounded-xl bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-inner"
                    title={t('auth.switchUser')}
                  >
                    <Users size={16} />
                  </a>
                </div>
              )}

              {/* Navigation Items */}
              <div>
                <p className={cn("text-sm font-black uppercase tracking-[0.2em] opacity-30 mb-4 px-2")}>{t('common.menu')}</p>
                <div className="space-y-1">
                  {navItems.map(item => {
                    const content = (
                      <>
                        <item.icon size={18} className="shrink-0" />
                        <span className="min-w-0 truncate">{item.name}</span>
                      </>
                    );
                    const commonClass = cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black transition-all w-full text-left min-w-0",
                      item.active 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : cn("opacity-60 hover:opacity-100", isDark ? "hover:bg-white/5" : "hover:bg-gray-100"),
                      item.className
                    );

                    if (item.onClick) {
                      return (
                        <button type="button" key={item.name} onClick={item.onClick} className={commonClass}>
                          {content}
                        </button>
                      );
                    }

                    return (
                      <a
                        key={item.path}
                        href={item.path}
                        className={commonClass}
                      >
                        {content}
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* System Actions */}
              <div className="space-y-6">
                <div>
                  <p className={cn("text-sm font-black uppercase tracking-[0.2em] opacity-30 mb-4 px-2")}>{t('about.open')}</p>
                  <button
                    type="button"
                    onClick={handleOpenAbout}
                    className={cn(
                      'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-black transition-all text-left',
                      isDark ? 'hover:bg-white/5 opacity-70 hover:opacity-100' : 'hover:bg-gray-100 opacity-70 hover:opacity-100'
                    )}
                  >
                    <Info size={18} />
                    {t('about.open')}
                  </button>
                </div>

                <div>
                  <p className={cn("text-sm font-black uppercase tracking-[0.2em] opacity-30 mb-4 px-2")}>{t('common.language')}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-1">
                    {(['auto', 'en', 'zh-cn', 'es', 'de', 'fr', 'ru', 'ja'] as Language[]).map((lang) => (
                      <button 
                        type="button"
                        key={lang}
                        onClick={() => setLanguage(lang)}
                        className={cn(
                          "px-2 py-2.5 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 min-w-0",
                          language === lang 
                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                            : cn("opacity-40 hover:opacity-100", isDark ? "hover:bg-white/5" : "hover:bg-gray-100")
                        )}
                      >
                        {lang === 'auto' && <Laptop size={18} />}
                        <span className="truncate w-full text-center">{getLanguageLabel(t, lang)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className={cn("text-sm font-black uppercase tracking-[0.2em] opacity-30 mb-4 px-2")}>{t('common.theme')}</p>
                  <div className="grid grid-cols-3 gap-2 p-1">
                    {([
                      { id: 'system', icon: Laptop },
                      { id: 'light', icon: Sun },
                      { id: 'dark', icon: Moon }
                    ] as { id: Theme, icon: React.ElementType }[]).map((mode) => (
                      <button 
                        type="button"
                        key={mode.id}
                        onClick={() => setTheme(mode.id)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl text-sm font-black transition-all flex flex-col items-center gap-1",
                          theme === mode.id 
                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                            : cn("opacity-40 hover:opacity-100", isDark ? "hover:bg-white/5" : "hover:bg-gray-100")
                        )}
                      >
                        <mode.icon size={18} />
                        <span>{getThemeLabel(t, mode.id)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              {isLoggedIn && (
                <div className="pt-4">
                  <button 
                    type="button"
                    onClick={handleLogout}
                    className={cn(
                      "w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-sm font-black transition-all border shadow-sm",
                      isDark 
                        ? "text-red-500 border-red-500/20 hover:bg-red-500/10" 
                        : "text-red-600 border-red-200 bg-red-50/50 hover:bg-red-50"
                    )}
                  >
                    <LogOut size={18} />
                    {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};
