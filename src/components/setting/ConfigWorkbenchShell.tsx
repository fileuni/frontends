import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";

interface ConfigWorkbenchShellProps {
  title: string;
  subtitle?: string | undefined;
  configPath?: string | null | undefined;
  configPathAction?: React.ReactNode | undefined;
  onClose?: (() => void) | undefined;
  closeAriaLabel?: string | undefined;
  headerActions?: React.ReactNode | undefined;
  containerClassName?: string | undefined;
  bodyClassName?: string | undefined;
  children: React.ReactNode;
}

export const ConfigWorkbenchShell: React.FC<ConfigWorkbenchShellProps> = ({
  title,
  subtitle,
  configPath,
  configPathAction,
  onClose,
  closeAriaLabel = "Close",
  headerActions,
  containerClassName,
  bodyClassName,
  children,
}) => {
  const resolvedTheme = useResolvedTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "w-full rounded-2xl sm:rounded-3xl border shadow-lg flex flex-col overflow-visible transition-colors",
        isDark
          ? "border-white/10 bg-slate-950 text-slate-100"
          : "border-slate-200 bg-white text-slate-900",
        containerClassName,
      )}
    >
      <div
        className={cn(
          "shrink-0 px-3 py-3 sm:px-5 border-b flex flex-col gap-3",
          isDark
            ? "border-white/10 bg-slate-900/50"
            : "border-slate-100 bg-slate-50/50",
        )}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="text-sm sm:text-base font-black tracking-wide truncate">
              {title}
            </div>
            {subtitle && (
              <div
                className={cn(
                  "text-xs sm:text-sm truncate font-bold",
                  isDark ? "text-slate-400" : "text-slate-500",
                )}
              >
                {subtitle}
              </div>
            )}
            {configPath && (
              <div className="mt-2 flex min-w-0 items-start gap-2">
                <div
                  className={cn(
                    "min-w-0 flex-1 rounded-xl border px-2.5 py-1.5 font-mono text-[11px] leading-5 sm:text-xs break-all",
                    isDark
                      ? "border-white/10 bg-black/20 text-slate-300"
                      : "border-slate-200 bg-white text-slate-700",
                  )}
                >
                  {configPath}
                </div>
                {configPathAction}
              </div>
            )}
          </div>
          {(headerActions || onClose) && (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:pl-4">
              {headerActions}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "h-8 w-8 rounded-lg border inline-flex items-center justify-center transition-colors",
                    isDark
                      ? "border-white/20 text-slate-300 hover:bg-white/10"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100",
                  )}
                  aria-label={closeAriaLabel}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className={cn("p-2 sm:p-4 lg:p-6", bodyClassName)}>{children}</div>
    </div>
  );
};
