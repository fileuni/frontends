import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SettingSegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string | undefined;
  buttonClassName?: string | undefined;
  equalWidth?: boolean | undefined;
}

export function SettingSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  equalWidth = true,
}: SettingSegmentedControlProps<T>) {
  const isDark = useResolvedTheme() === "dark";

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-stretch rounded-3xl border p-1",
        isDark
          ? "border-white/10 bg-white/[0.03]"
          : "border-slate-200 bg-white",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "min-w-0 rounded-full px-3 py-2 text-center text-sm font-black leading-5 transition-colors whitespace-normal break-words",
              equalWidth ? "flex-1" : "shrink-0 grow-0 basis-auto",
              active
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : isDark
                  ? "text-slate-200 hover:bg-white/10"
                  : "text-slate-700 hover:bg-slate-50",
              buttonClassName,
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
