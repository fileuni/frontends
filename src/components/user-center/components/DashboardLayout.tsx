import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import * as LucideIcons from "lucide-react";
import { useAuthzStore } from "@/stores/authz.ts";
import { useConfigStore } from "@/stores/config.ts";
import { useThemeStore } from '@/stores/theme';
import { useNavigationStore } from "@/stores/navigation.ts";
import { cn } from "@/lib/utils.ts";
import { client, extractData } from "@/lib/api";
import { fetchPluginNavItems, normalizePluginRoute, type PluginNavItem } from '@/lib/plugin-nav';

type LucideIconComponent = React.ComponentType<{ size?: number; className?: string }>;

/**
 * 辅助组件：安全渲染图标，防止混淆后的初始化顺序错误 (ReferenceError: L is not defined)
 */
const IconRenderer = ({ name, size = 18, className }: { name: string, size?: number | undefined, className?: string | undefined }) => {
  const iconRegistry = LucideIcons as unknown as Record<string, LucideIconComponent>;
  const Icon = iconRegistry[name];
  if (!Icon) return null;
  return <Icon size={size} {...(className ? { className } : {})} />;
};

const navigateToHash = (path: string) => {
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
};

export const DashboardLayout: React.FC<{
  children: React.ReactNode;
  title?: string;
  pathname?: string;
  customSidebar?: React.ReactNode;
  fullWidth?: boolean;
}> = ({
  children,
  title,
  customSidebar,
  fullWidth = false,
}) => {
  const { t } = useTranslation();
  const { params } = useNavigationStore();
  const { hasPermission } = useAuthzStore();
  const { capabilities } = useConfigStore();
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [domainNavFlags, setDomainNavFlags] = useState<{ moduleEnabled: boolean } | null>(null);
  const [pluginNavItems, setPluginNavItems] = useState<PluginNavItem[]>([]);

  useEffect(() => {
    setMounted(true);
    void fetchPluginNavItems()
      .then((items) => setPluginNavItems(items))
      .catch((error) => {
        console.error('Failed to fetch plugin nav items', error);
      });
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && mounted && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const mod = params.mod || 'public';
  const page = params.page || 'index';
  const isAdmin = mounted && hasPermission("admin.access");
  const enableFileManager = capabilities?.enable_api !== false;

  useEffect(() => {
    let cancelled = false;

    if (!mounted || !isAdmin) {
      setDomainNavFlags(null);
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const configData = await extractData<Record<string, unknown>>(client.GET('/api/v1/admin/system/config'));

        const getBool = (root: unknown, path: string[]): boolean | null => {
          let cur: unknown = root;
          for (const key of path) {
            if (typeof cur !== 'object' || cur === null) return null;
            const rec = cur as Record<string, unknown>;
            cur = rec[key];
          }
          return typeof cur === 'boolean' ? cur : null;
        };

        // Some backends return only a subset of config fields.
        // If the domain module flag is not present, keep domain entries visible.
        const moduleEnabled = getBool(configData, ['domain_acme_ddns', 'enabled']) ?? true;

        if (!cancelled) {
          setDomainNavFlags({ moduleEnabled });
        }
      } catch {
        if (!cancelled) setDomainNavFlags(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, isAdmin]);

  // Use useMemo to ensure config objects are not initialized at module top level
  const { navItems, adminItems } = useMemo(() => ({
    navItems: [
      { name: t("nav.dashboard"), icon: "LayoutDashboard", m: "user", p: "welcome", path: "#mod=user&page=welcome" },
      { name: t("nav.profile"), icon: "User", m: "user", p: "profile", path: "#mod=user&page=profile" },
      { name: t("nav.security"), icon: "ShieldCheck", m: "user", p: "security", path: "#mod=user&page=security" },
      { name: t("nav.sessions"), icon: "Laptop", m: "user", p: "sessions", path: "#mod=user&page=sessions" },
    ],
    adminItems: [
      { name: t("nav.userList"), icon: "Users", m: "admin", p: "users", path: "#mod=admin&page=users" },
      { name: t("nav.maintenance"), icon: "HardDrive", m: "admin", p: "files", path: "#mod=admin&page=files" },
      { name: t('admin.mounts.title') || 'Remote Mounts', icon: 'Cloud', m: 'admin', p: 'mounts', path: '#mod=admin&page=mounts' },
      { name: t("common.manage"), icon: "ShieldAlert", m: "admin", p: "permissions", path: "#mod=admin&page=permissions" },
      { name: t("admin.blacklist.title") || "Access Guard", icon: "ShieldAlert", m: "admin", p: "blacklist", path: "#mod=admin&page=blacklist" },
      { name: t("admin.backup.title") || "System Backup", icon: "Archive", m: "admin", p: "backup", path: "#mod=admin&page=backup" },
      { name: t("nav.domainDdns"), icon: "Globe", m: "admin", p: "domain-ddns", path: "#mod=admin&page=domain-ddns" },
      { name: t("nav.domainSsl"), icon: "ShieldCheck", m: "admin", p: "domain-ssl", path: "#mod=admin&page=domain-ssl" },
      { name: t("admin.web.title"), icon: "Server", m: "admin", p: "web", path: "#mod=admin&page=web" },
      { name: t("admin.tasks.title") || "Background Tasks", icon: "Activity", m: "admin", p: "tasks", path: "#mod=admin&page=tasks" },
      { name: t("admin.audit.title") || "Audit Logs", icon: "ClipboardList", m: "admin", p: "audit", path: "#mod=admin&page=audit" },
      { name: t("nav.settings"), icon: "Settings", m: "admin", p: "config", path: "#mod=admin&page=config" },
      { name: t("nav.about"), icon: "Info", m: "admin", p: "about", path: "#mod=admin&page=about" },
    ]
  }), [t]);

  const filteredAdminItems = useMemo(() => {
    const domainVisible = domainNavFlags ? domainNavFlags.moduleEnabled : true;
    return adminItems.filter((item) => {
      if (item.p === 'domain-ddns') return domainVisible;
      if (item.p === 'domain-ssl') return domainVisible;
      return true;
    });
  }, [adminItems, domainNavFlags]);

  // Extract sidebar content as inner render function to ensure closure safety
  const renderSidebar = (isMobile = false) => (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {customSidebar && (
          <div className={cn("mb-8 pb-4 border-b", isDark ? "border-white/5" : "border-gray-200")}>
            {customSidebar}
          </div>
        )}

        <p className={cn("px-4 text-sm font-black tracking-widest opacity-30 mb-4", isDark ? "text-white" : "text-gray-900")}>
          {t("common.manage")}
        </p>
        
        {navItems.map((item) => (
          <button
            key={item.path}
            type="button"
            onClick={() => {
              navigateToHash(item.path);
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
              (mod === item.m && (item.p ? page === item.p : true))
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : cn("opacity-50 hover:opacity-100", isDark ? "hover:bg-white/5" : "hover:bg-gray-100"),
            )}
          >
            <IconRenderer name={item.icon} size={18} />
            <span className={isDark ? "text-white" : "text-gray-900"}>{item.name}</span>
          </button>
        ))}

        {enableFileManager && (
          <button
            type="button"
            onClick={() => {
              navigateToHash('#mod=file-manager&page=files');
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
              mod === "file-manager"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : cn("opacity-50 hover:opacity-100", isDark ? "hover:bg-white/5" : "hover:bg-gray-100"),
            )}
          >
            <IconRenderer name="FolderOpen" size={18} />
            <span className={isDark ? "text-white" : "text-gray-900"}>{t("nav.filemanager")}</span>
          </button>
        )}

        {pluginNavItems.length > 0 && (
          <div className={cn("mt-8 pt-4 border-t", isDark ? "border-white/5" : "border-gray-200")}>
            <p className={cn("px-4 text-sm font-black tracking-widest opacity-30 mb-4", isDark ? "text-white" : "text-gray-900")}>
              Plugins
            </p>
            {pluginNavItems
              .filter((item) => item.visibility !== 'admin-only' || isAdmin)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => {
                const target = normalizePluginRoute(`mod=plugin&page=view&plugin_id=${encodeURIComponent(item.plugin_id)}&plugin_route=${encodeURIComponent(item.route)}`);
                return (
                  <button
                    key={`${item.plugin_id}:${item.item_key}`}
                    type="button"
                    onClick={() => {
                      navigateToHash(target);
                      if (isMobile) setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                      mod === 'plugin' && params['plugin_id'] === item.plugin_id
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : cn("opacity-50 hover:opacity-100", isDark ? "hover:bg-white/5" : "hover:bg-gray-100"),
                    )}
                  >
                    <IconRenderer name={item.icon || 'PanelLeft'} size={18} />
                    <span className={isDark ? "text-white" : "text-gray-900"}>{item.label}</span>
                  </button>
                );
              })}
          </div>
        )}

        {isAdmin && (
          <div className={cn("mt-8 pt-4 border-t", isDark ? "border-white/5" : "border-gray-200")}>
            <p className="px-4 text-sm font-black tracking-widest opacity-30 mb-4 text-red-500">
              {t("common.admin")}
            </p>
            {filteredAdminItems.map((item) => (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigateToHash(item.path);
                  if (isMobile) setIsMobileMenuOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all",
                  (mod === item.m && (item.p ? page === item.p : true))
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                    : cn("opacity-50 hover:opacity-100", isDark ? "hover:bg-red-500/5 hover:text-red-400" : "hover:bg-red-50 hover:text-red-600"),
                )}
              >
                <IconRenderer name={item.icon} size={18} />
                <span className={isDark ? "text-white" : "text-gray-900"}>{item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={cn("mt-auto pt-4 border-t flex flex-wrap gap-x-4 gap-y-2 px-2 pb-2", isDark ? "border-white/5" : "border-gray-200")}>
        <button type="button" onClick={() => navigateToHash('#mod=public&page=tos')} className="text-sm font-black tracking-widest opacity-20 hover:opacity-100 hover:text-primary transition-all">{t("pages.tos.title")}</button>
        <button type="button" onClick={() => navigateToHash('#mod=public&page=privacy')} className="text-sm font-black tracking-widest opacity-20 hover:opacity-100 hover:text-primary transition-all">{t("pages.privacy.title")}</button>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('fileuni:open-about'))}
          className="text-sm font-black tracking-widest opacity-20 hover:opacity-100 hover:text-primary transition-all"
        >
          {t('about.open')}
        </button>
      </div>
    </div>
  );

  return (
    <div className={cn("h-screen min-h-0 bg-background flex flex-col", isDark ? "" : "bg-gray-50")}>
      {/* Mobile Top Bar */}
      <div className={cn("md:hidden fixed top-16 left-0 right-0 h-12 backdrop-blur-md border-b z-40 flex items-center px-4", isDark ? "bg-white/[0.03] border-white/5" : "bg-white border-gray-200")}>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn("p-2 -ml-2 rounded-lg text-primary", isDark ? "hover:bg-white/5" : "hover:bg-gray-100")}
        >
          {isMobileMenuOpen ? <IconRenderer name="X" size={20} /> : <IconRenderer name="Menu" size={20} />}
        </button>
        <span className={cn("ml-2 text-sm font-black tracking-widest opacity-50", isDark ? "text-white" : "text-gray-900")}>
          {title || t("nav.dashboard")}
        </span>
      </div>

      <div className="flex-1 flex pt-16 md:pt-16 h-full overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className={cn("hidden md:flex w-64 border-r flex-col p-4 shrink-0", isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-200 bg-white")}>
          {renderSidebar(false)}
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <button type="button" className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[50]" onClick={() => setIsMobileMenuOpen(false)} aria-label={t('common.close')} />
        )}

        {/* Mobile Sidebar Drawer */}
        <aside
          className={cn(
            "md:hidden fixed top-0 left-0 bottom-0 w-72 border-r z-[60] p-4 transition-transform duration-300 ease-in-out",
            isDark ? "bg-zinc-950 border-white/10" : "bg-white border-gray-200",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
						<img src="/favicon.svg" alt={t('common.logoAlt')} width={32} height={32} className="shadow-lg rounded-lg" />
              <span className={cn("font-black text-sm tracking-tight", isDark ? "text-white" : "text-gray-900")}>{t('common.brandName')}</span>
            </div>
            <button type="button" onClick={() => setIsMobileMenuOpen(false)} className={cn("p-2 rounded-lg", isDark ? "bg-white/5" : "bg-gray-100")}>
              <IconRenderer name="X" size={18} />
            </button>
          </div>
          {renderSidebar(true)}
        </aside>

        {/* Main Content */}
        <main className={cn("mt-12 flex-1 md:mt-0", fullWidth ? "overflow-hidden p-0" : "overflow-y-auto overscroll-contain touch-pan-y custom-scrollbar p-6 md:p-10")}>
          <div className={cn("w-full animate-in fade-in slide-in-from-bottom-2 duration-500", fullWidth ? "max-w-none h-full min-h-0" : "max-w-none")}>
            {title && <h1 className="text-4xl font-black tracking-tight mb-8 hidden md:block">{title}</h1>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
