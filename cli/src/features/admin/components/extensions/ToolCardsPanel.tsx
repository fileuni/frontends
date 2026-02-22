import { Button } from '@/components/ui/Button.tsx';
import type { ServiceStatus, ToolInfo } from './types.ts';

type Props = {
  tools: ToolInfo[];
  serviceMap: Record<string, ServiceStatus>;
  installingTool: string;
  installLabel: string;
  installingLabel: string;
  installedLabel: string;
  notInstalledLabel: string;
  startLabel: string;
  stopLabel: string;
  restartLabel: string;
  onInstall: (tool: string) => void;
  onControlService: (tool: string, action: 'start' | 'stop' | 'restart') => void;
};

export const ToolCardsPanel = (props: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {props.tools.map((tool) => (
      <div key={tool.name} className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-base font-extrabold">{tool.name}</div>
            <div className="text-sm opacity-60 break-all">{tool.executable_path}</div>
            <div className="text-sm opacity-70 mt-1">
              {props.serviceMap[tool.name]?.running
                ? `service: running (pid ${props.serviceMap[tool.name]?.pid ?? '-'})`
                : 'service: stopped'}
            </div>
            <div className="text-sm opacity-60">
              follow_start: {props.serviceMap[tool.name]?.follow_start ? 'true' : 'false'}
            </div>
          </div>
          <span className={`text-sm px-2 py-1 rounded-full ${tool.installed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/20 text-zinc-300'}`}>
            {tool.installed ? props.installedLabel : props.notInstalledLabel}
          </span>
        </div>
        <Button size="sm" onClick={() => props.onInstall(tool.name)} disabled={props.installingTool.length > 0} className="w-full">
          {props.installingTool === tool.name ? props.installingLabel : props.installLabel}
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" onClick={() => props.onControlService(tool.name, 'start')}>{props.startLabel}</Button>
          <Button size="sm" variant="outline" onClick={() => props.onControlService(tool.name, 'stop')}>{props.stopLabel}</Button>
          <Button size="sm" variant="outline" onClick={() => props.onControlService(tool.name, 'restart')}>{props.restartLabel}</Button>
        </div>
      </div>
    ))}
  </div>
);
