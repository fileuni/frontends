import { Button } from '@/components/ui/Button.tsx';
import { AdminCard } from '../../admin-ui';
import type { ExtensionTabItem } from '../tabItems';

export const ExtensionsTabBar = ({
  items,
  activeKey,
  onSelect,
}: {
  items: ExtensionTabItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}) => {
  return (
    <AdminCard
      variant="glass"
      className="p-1.5 sm:p-2 rounded-xl sm:rounded-[1.5rem] md:rounded-[2rem] flex gap-1.5 sm:gap-2 flex-wrap justify-center sm:justify-start shadow-xl md:shadow-2xl backdrop-blur-sm mx-0 sm:mx-1"
    >
      {items.map((item) => (
        <Button
          key={item.key}
          size="sm"
          variant={activeKey === item.key ? 'primary' : 'ghost'}
          onClick={() => onSelect(item.key)}
          className={`relative rounded-lg sm:rounded-xl md:rounded-2xl px-4 sm:px-6 md:px-8 h-9 sm:h-10 md:h-12 font-black uppercase tracking-widest text-xs sm:text-sm md:text-[14px] transition-all duration-300 ${
            activeKey === item.key
              ? 'shadow-lg sm:shadow-xl md:shadow-xl shadow-primary/30'
              : 'opacity-40 hover:opacity-100 hover:bg-white/5'
          }`}
        >
          {item.label}
          {item.installed && (
            <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 flex h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 bg-green-500 shadow-sm shadow-green-500/50" />
            </span>
          )}
        </Button>
      ))}
    </AdminCard>
  );
};
