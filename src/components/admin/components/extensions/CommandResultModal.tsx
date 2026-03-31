import { Modal } from '@/components/ui/Modal.tsx';
import { Button } from '@/components/ui/Button.tsx';
import { useTranslation } from 'react-i18next';
import type { CmdResult } from './types.ts';

type Props = {
  title: string;
  result: CmdResult | null;
  isOpen: boolean;
  onClose: () => void;
};

export const CommandResultModal = ({ title, result, isOpen, onClose }: Props) => {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-5xl">
      <div className="p-4 sm:p-6 md:p-10 space-y-5 sm:space-y-6">
        {result ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black uppercase opacity-40 tracking-widest">{t('admin.extensions.exitCode')}</span>
              <span className={`px-3 py-1 rounded-lg font-bold ${result.code === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{result.code}</span>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-black uppercase opacity-40 tracking-widest">{t('admin.extensions.stdout')}</div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-sm whitespace-pre-wrap break-all max-h-[30vh] overflow-auto">{result.stdout || '--'}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-black uppercase opacity-40 tracking-widest">{t('admin.extensions.stderr')}</div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-sm whitespace-pre-wrap break-all max-h-[30vh] overflow-auto">{result.stderr || '--'}</div>
            </div>
          </>
        ) : null}
        <div className="flex justify-end">
          <Button className="rounded-2xl px-8 h-11" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </Modal>
  );
};
