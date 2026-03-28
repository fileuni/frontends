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
  className?: string;
  buttonClassName?: string;
}

export function SettingSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  buttonClassName,
}: SettingSegmentedControlProps<T>) {
  const isDark = useResolvedTheme() === "dark";

  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center rounded-full border p-1",
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
              "h-9 rounded-full px-3 text-sm font-black transition-colors",
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
