import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  Database,
  FolderCog,
  ImagePlus,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Video,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/stores/navigation";

export interface SettingActionItem {
  id: string;
  routeKey?: string;
  routeAliases?: string[];
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  actionLabel?: string;
  eyebrow?: string;
  points?: string[];
  stats?: Array<{ label: string; value: string }>;
  renderPanel?: () => React.ReactNode;
  actions?: Array<{
    id: string;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    variant?: "primary" | "secondary";
  }>;
}

interface SettingOverviewProps {
  commonActions?: SettingActionItem[];
}

const normalizeRouteToken = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s\-/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const resolveActionFromRouteItem = (
  actions: SettingActionItem[],
  routeItem: string | undefined,
): SettingActionItem | undefined => {
  if (!routeItem) return undefined;
  const normalized = normalizeRouteToken(routeItem);
  return actions.find((item) => {
    const candidates = new Set<string>([
      item.id,
      item.routeKey ?? item.id,
      item.label,
      ...(item.routeAliases ?? []),
    ]);
    return Array.from(candidates).some(
      (candidate) => normalizeRouteToken(candidate) === normalized,
    );
  });
};

export const SettingOverview: React.FC<SettingOverviewProps> = ({
  commonActions = [],
}) => {
  const { t } = useTranslation();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === "dark";
  const params = useNavigationStore((state) => state.params);
  const navigate = useNavigationStore((state) => state.navigate);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsSidebarExpanded(window.innerWidth >= 1024);
  }, []);

  const steps = useMemo(
    () => [
      {
        id: "performance",
        icon: Sparkles,
        title: t("systemConfig.setup.steps.performance"),
      },
      {
        id: "database-cache",
        icon: Database,
        title: t("systemConfig.setup.steps.databaseCache"),
      },
      { id: "storage", icon: FolderCog, title: t("systemConfig.setup.steps.storage") },
      { id: "admin", icon: ShieldCheck, title: t("systemConfig.setup.steps.adminPassword") },
      { id: "finish", icon: Zap, title: t("systemConfig.setup.steps.finishSimple") },
    ],
    [t],
  );

  const [manualSelectedSettingId, setManualSelectedSettingId] = useState<string>(
    commonActions[0]?.id ?? "",
  );

  useEffect(() => {
    if (params["item"]) {
      return;
    }
    if (!commonActions.some((item) => item.id === manualSelectedSettingId)) {
      setManualSelectedSettingId(commonActions[0]?.id ?? "");
    }
  }, [commonActions, manualSelectedSettingId, params]);

  const handleSelectSetting = (id: string) => {
    setManualSelectedSettingId(id);
    if (params.mod !== "admin" || params.page !== "config") {
      return;
    }
    const active = commonActions.find((item) => item.id === id);
    if (!active) return;
    navigate({ item: active.routeKey ?? active.id });
  };

  const selectedSettingId = useMemo(() => {
    const routed = resolveActionFromRouteItem(commonActions, params["item"]);
    if (routed) {
      return routed.id;
    }
    if (commonActions.some((item) => item.id === manualSelectedSettingId)) {
      return manualSelectedSettingId;
    }
    return commonActions[0]?.id ?? "";
  }, [commonActions, manualSelectedSettingId, params]);

  const activeItem = useMemo(
    () =>
      commonActions.find((item) => item.id === selectedSettingId) ??
      commonActions[0],
    [commonActions, selectedSettingId],
  );
  const ActiveIcon = activeItem?.icon;

  return (
    <div className="space-y-3 sm:space-y-4">
      <section
        className={cn(
          "rounded-[1.5rem] border p-3 sm:p-4 shadow-sm",
          isDark
            ? "border-white/10 bg-slate-950"
            : "border-sky-200/70 bg-gradient-to-br from-sky-50 via-cyan-50 to-white",
        )}
      >
        <div>
          <div>
            <h2
              className={cn(
                "text-lg font-black tracking-tight sm:text-xl",
                isDark ? "text-slate-100" : "text-slate-900",
              )}
            >
              {t("systemConfig.setup.steps.step")}
            </h2>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1 sm:hidden">
          {steps.map(({ id, title }, index) => (
            <React.Fragment key={id}>
              <div
                className={cn(
                  "rounded-full border px-2.5 py-1.5 text-xs font-black transition-colors",
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200"
                    : "border-slate-200 bg-white text-slate-700",
                )}
              >
                {index + 1}. {title}
              </div>
              {index < steps.length - 1 && (
                <ChevronRight
                  size={14}
                  className={isDark ? "text-slate-500" : "text-slate-400"}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-3 hidden gap-2 sm:grid sm:grid-cols-2 xl:grid-cols-5">
          {steps.map(({ id, icon: Icon, title }, index) => (
            <article
              key={id}
              className={cn(
                "rounded-2xl border p-2.5",
                isDark
                  ? "border-white/10 bg-white/[0.04]"
                  : "border-slate-200 bg-white",
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl",
                    isDark
                      ? "bg-sky-500/15 text-sky-200"
                      : "bg-sky-100 text-sky-700",
                  )}
                >
                  <Icon size={15} />
                </div>
                <div
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-black",
                    isDark
                      ? "bg-white/10 text-slate-100"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
              </div>
              <div
                className={cn(
                  "mt-2 text-[13px] font-black leading-5 sm:text-sm",
                  isDark ? "text-slate-100" : "text-slate-900",
                )}
              >
                {title}
              </div>
            </article>
          ))}
        </div>
      </section>

      {commonActions.length > 0 && activeItem && (
        <section
          className={cn(
            "rounded-[1.75rem] border p-3 sm:p-4 shadow-sm",
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-slate-200 bg-white",
          )}
        >
          <div
            className={cn(
              "grid items-start gap-3",
              isSidebarExpanded
                ? "grid-cols-[minmax(11rem,13rem)_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)]"
                : "grid-cols-[4.25rem_minmax(0,1fr)]",
            )}
          >
            <aside
              className={cn(
                "sticky top-[calc(0.75rem+var(--safe-area-top,0px))] self-start border p-2 z-10 max-h-[calc(100dvh-1.5rem-var(--safe-area-top,0px))] max-w-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y",
                isSidebarExpanded ? "rounded-3xl" : "rounded-2xl",
                isSidebarExpanded ? "w-full min-w-0" : "w-[4.25rem]",
                isDark
                  ? "border-white/10 bg-black/20"
                  : "border-slate-200 bg-slate-50/70",
              )}
            >
              <button
                type="button"
                onClick={() => setIsSidebarExpanded((prev) => !prev)}
                className={cn(
                  "mb-2 flex w-full items-center justify-center rounded-xl border px-2 py-2 text-[11px] font-black tracking-[0.18em] transition-colors",
                  isDark
                    ? "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                )}
                aria-label={
                  isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
                }
                title={
                  isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar"
                }
              >
                <span>{isSidebarExpanded ? "−" : "+"}</span>
              </button>
              <div className={cn("grid gap-1.5")}>
                {commonActions.map(({ id, label, icon: Icon }) => {
                  const active = selectedSettingId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectSetting(id)}
                      className={cn(
                        !isSidebarExpanded
                          ? "flex w-full items-center justify-center rounded-xl px-2 py-3 text-left text-sm font-black transition-colors min-h-11"
                          : "flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black transition-colors min-h-11",
                        active
                          ? isDark
                            ? "bg-cyan-500/15 text-cyan-100"
                            : "bg-cyan-100 text-cyan-950"
                          : isDark
                            ? "text-slate-200 hover:bg-white/5"
                            : "text-slate-700 hover:bg-white",
                      )}
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl",
                            active
                              ? isDark
                                ? "bg-cyan-500/20 text-cyan-100"
                              : "bg-cyan-100 text-cyan-800"
                            : isDark
                              ? "bg-white/10 text-slate-200"
                              : "bg-slate-100 text-slate-700",
                        )}
                      >
                        <Icon size={15} />
                        </div>
                        {isSidebarExpanded && (
                          <span className="min-w-0 whitespace-normal break-words leading-5">
                            {label}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section
              id={`setting-inline-${activeItem.id}`}
              data-setting-action-id={activeItem.id}
              className={cn(
                "min-w-0 rounded-3xl border p-4 sm:p-5 transition-colors",
                isDark
                  ? "border-cyan-400/25 bg-cyan-500/10"
                  : "border-cyan-200 bg-cyan-50/70 shadow-sm",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl",
                        isDark
                          ? "bg-cyan-500/20 text-cyan-100"
                          : "bg-cyan-100 text-cyan-800",
                      )}
                    >
                      {ActiveIcon && <ActiveIcon size={18} />}
                    </div>
                    <div>
                      <h3
                        className={cn(
                          "text-lg font-black",
                          isDark ? "text-slate-100" : "text-slate-900",
                        )}
                      >
                        {activeItem.label}
                      </h3>
                    </div>
                  </div>
                  {activeItem.description.trim().length > 0 && (
                    <p
                      className={cn(
                        "mt-4 max-w-2xl text-sm leading-7",
                        isDark ? "text-slate-300" : "text-slate-700",
                      )}
                    >
                      {activeItem.description}
                    </p>
                  )}
                </div>

                {activeItem.onClick && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={activeItem.onClick}
                      disabled={activeItem.disabled}
                      className={cn(
                        "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        isDark
                          ? "border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/10"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100",
                      )}
                    >
                      <span>
                        {activeItem.actionLabel ?? t("systemConfig.setup.guide.openAction")}
                      </span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>

              {(activeItem.renderPanel ||
                activeItem.stats?.length ||
                activeItem.points?.length) && (
                <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  {activeItem.renderPanel && (
                    <div className="xl:col-span-2">
                      {activeItem.renderPanel()}
                    </div>
                  )}

                  {activeItem.stats && activeItem.stats.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeItem.stats.map((stat) => (
                        <div
                          key={`${activeItem.id}:${stat.label}`}
                          className={cn(
                            "rounded-2xl border px-3 py-3",
                            isDark
                              ? "border-white/10 bg-white/[0.03]"
                              : "border-slate-200 bg-white",
                          )}
                        >
                          <div
                            className={cn(
                              "text-[11px] font-black tracking-[0.18em]",
                              isDark ? "text-slate-400" : "text-slate-500",
                            )}
                          >
                            {stat.label}
                          </div>
                          <div
                            className={cn(
                              "mt-2 text-sm leading-6",
                              isDark ? "text-slate-200" : "text-slate-700",
                            )}
                          >
                            {stat.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeItem.points && activeItem.points.length > 0 && (
                    <div
                      className={cn(
                        "rounded-2xl border p-3",
                        isDark
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-slate-200 bg-white",
                      )}
                    >
                      <div className="mt-3 space-y-2">
                        {activeItem.points.map((point) => (
                          <div
                            key={`${activeItem.id}:${point}`}
                            className={cn(
                              "flex gap-2 text-sm leading-6",
                              isDark ? "text-slate-300" : "text-slate-700",
                            )}
                          >
                            <span className="mt-2 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeItem.actions && activeItem.actions.length > 0 && (
                <div
                  className={cn(
                    "mt-4 flex flex-wrap items-center gap-2 border-t pt-4",
                    isDark ? "border-white/10" : "border-slate-200",
                  )}
                >
                  {activeItem.actions.map((action) => (
                    <button
                      key={`${activeItem.id}:${action.id}`}
                      type="button"
                      onClick={action.onClick}
                      disabled={action.disabled || !action.onClick}
                      className={cn(
                        "inline-flex h-10 items-center justify-center rounded-2xl border px-4 text-sm font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        action.variant === "primary"
                          ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90"
                          : isDark
                            ? "border-white/10 bg-white/[0.03] text-slate-100 hover:bg-white/10"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100",
                      )}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </div>
  );
};

export const settingCommonIcons = {
  admin: KeyRound,
  license: ShieldCheck,
  storage: FolderCog,
  protectedStorage: ShieldCheck,
  thumbnail: ImagePlus,
  mediaTranscoding: Video,
  compression: Zap,
  database: Database,
  cache: Database,
  performance: Sparkles,
} as const;
