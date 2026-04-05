import React from "react";
import { LanguageMenuButton } from "@/components/public/components/LanguageMenuButton";
import { ThemeToggleButton } from "@/components/public/components/ThemeToggleButton";

interface SettingSurfaceControlsProps {
  className?: string | undefined;
  compact?: boolean | undefined;
}

export const SettingSurfaceControls: React.FC<SettingSurfaceControlsProps> = ({
  className,
  compact = false,
}) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <LanguageMenuButton compact={compact} />
        <ThemeToggleButton />
      </div>
    </div>
  );
};
