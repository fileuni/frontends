import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, Keyboard, Info
} from 'lucide-react';
import { GlassModalShell } from '@fileuni/ts-shared/modal-shell';
import { Button } from '@/components/ui/Button.tsx';
import { useEscapeToCloseTopLayer } from '@/hooks/useEscapeToCloseTopLayer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 专业集成 i18n 的快捷键说明模态框 / Professional i18n-integrated Shortcuts Modal
 */
export const ShortcutsHelpModal = ({ isOpen, onClose }: Props) => {
  const { t } = useTranslation();

  useEscapeToCloseTopLayer({
    active: isOpen,
    onEscape: onClose,
  });

  if (!isOpen) return null;

  const sections = [
    {
      title: t('filemanager.help.sections.selection.title'),
      items: [
        { keys: ["Ctrl", "A"], desc: t('filemanager.help.sections.selection.selectAll') },
        { keys: ["Shift", "Click"], desc: t('filemanager.help.sections.selection.rangeSelect') },
        { keys: ["Ctrl", "Click"], desc: t('filemanager.help.sections.selection.multiSelect') },
        { keys: ["Esc"], desc: t('filemanager.help.sections.selection.escape') },
      ]
    },
    {
      title: t('filemanager.help.sections.fileOps.title'),
      items: [
        { keys: ["Ctrl", "C"], desc: t('filemanager.help.sections.fileOps.copy') },
        { keys: ["Ctrl", "X"], desc: t('filemanager.help.sections.fileOps.cut') },
        { keys: ["Ctrl", "V"], desc: t('filemanager.help.sections.fileOps.paste') },
        { keys: ["F2"], desc: t('filemanager.help.sections.fileOps.rename') },
        { keys: ["Delete"], desc: t('filemanager.help.sections.fileOps.delete') },
      ]
    },
    {
      title: t('filemanager.help.sections.mouse.title'),
      items: [
        { keys: ["Double Click"], desc: t('filemanager.help.sections.mouse.doubleClick') },
        { keys: ["Right Click"], desc: t('filemanager.help.sections.mouse.rightClick') },
        { keys: ["Long Press"], desc: t('filemanager.help.sections.mouse.longPress') },
        { keys: ["Drag & Drop"], desc: t('filemanager.help.sections.mouse.dragDrop') },
      ]
    }
  ];

  return (
    <GlassModalShell
      title={t('filemanager.help.title')}
      subtitle={t('filemanager.help.subtitle')}
      icon={<Keyboard size={24} />}
      onClose={onClose}
      maxWidthClassName="max-w-2xl"
      bodyClassName="grid grid-cols-1 md:grid-cols-2 gap-8"
      closeButton={(
        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-2xl h-12 w-12 p-0 hover:bg-white/5">
          <X size={24} className="opacity-40" />
        </Button>
      )}
      footer={(
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-30 italic max-w-[70%]">
            <Info size={18} className="shrink-0" />
            <span className="text-sm font-medium leading-tight">{t('filemanager.help.tip')}</span>
          </div>
          <Button onClick={onClose} className="rounded-2xl px-8 h-12 font-black text-sm shadow-xl shadow-primary/20">
            {t('filemanager.help.gotIt')}
          </Button>
        </div>
      )}
    >
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="text-sm font-black tracking-[0.2em] text-primary/60 border-b border-white/5 pb-2">
                {section.title}
              </h4>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={`${section.title}-${item.desc}`} className="flex items-start justify-between gap-4 group">
                    <p className="text-sm text-white/60 group-hover:text-white/90 transition-colors leading-tight py-1">
                      {item.desc}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                       {item.keys.map((key, keyIndex) => (
                         <React.Fragment key={`${item.desc}-${key}`}>
                          <kbd className="min-w-[32px] h-6 px-1.5 flex items-center justify-center bg-white/5 border border-white/10 rounded-md text-sm font-black font-mono text-white/40 group-hover:text-primary transition-colors">
                            {key}
                          </kbd>
                          {keyIndex < item.keys.length - 1 && <span className="text-sm opacity-20">+</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
    </GlassModalShell>
  );
};
