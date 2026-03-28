import React from 'react';
import { Pencil } from 'lucide-react';

interface ConfigPathActionButtonProps {
  onClick: () => void;
  label: string;
}

export const ConfigPathActionButton: React.FC<ConfigPathActionButtonProps> = ({ onClick, label }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-900 shadow-sm transition-all hover:bg-cyan-100 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-100 dark:hover:bg-cyan-500/20"
      aria-label={label}
      title={label}
    >
      <Pencil size={16} />
    </button>
  );
};
