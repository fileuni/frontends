import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { cn } from '@/lib/utils.ts';
import type { FileInfo } from '../types/index.ts';
import { OpenWithMenu } from './OpenWithMenu.tsx';

interface Props {
  file: FileInfo;
  onForcePreview: () => void;
  onCancel: () => void;
  isDark?: boolean;
}

export const LargeFileWarning = ({ file, onForcePreview, onCancel, isDark }: Props) => {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

  return (
    <div className={cn("h-screen w-screen flex flex-col items-center justify-center p-10", isDark ? "bg-[#09090b] text-white" : "bg-white text-zinc-900")}>
        <div className="w-20 h-20 rounded-[2rem] bg-amber-500/10 flex items-center justify-center text-amber-500 mb-8 shadow-inner animate-pulse">
            <AlertTriangle size={40} />
        </div>
        <h2 className="text-2xl font-black italic tracking-tighter mb-2">Large File Detected</h2>
        <p className="opacity-40 text-sm mb-8 text-center max-w-sm leading-relaxed">
            The file <span className="font-bold opacity-100 italic">"{file.name}"</span> is <b>{sizeMB} MB</b>. 
            Opening large files directly may cause browser performance issues.
        </p>
        
        <div className="flex flex-col gap-4 w-full max-w-xs">
            {/* Open With Menu - Primary Action */}
            <div className="flex justify-center">
                 <OpenWithMenu file={file} onInternalPreview={onForcePreview} variant="primary" className="w-full" />
            </div>

            <div className="h-px bg-border/50 w-full" />

            <div className="flex gap-4 justify-center">
                <Button variant="ghost" className="h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-sm" onClick={onCancel}>
                    <X size={14} className="mr-2" /> Cancel
                </Button>
                <Button variant="outline" className="h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-sm" onClick={onForcePreview}>
                    <ChevronRight size={14} className="mr-2" /> Preview Anyway
                </Button>
            </div>
        </div>
    </div>
  );
};
