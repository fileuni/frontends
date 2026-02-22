import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import type { CmdResult } from './types.ts';

type Props = {
  title: string;
  runLabel: string;
  toolNames: string[];
  commandTool: string;
  setCommandTool: (value: string) => void;
  commandArgs: string;
  setCommandArgs: (value: string) => void;
  cmdResult: CmdResult | null;
  onRun: () => void;
};

export const CommandPanel = (props: Props) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
    <h4 className="text-base font-black">{props.title}</h4>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      <select
        className="h-10 rounded-lg border border-white/10 bg-black/20 px-3 text-sm"
        value={props.commandTool}
        onChange={(e) => props.setCommandTool(e.target.value)}
      >
        {props.toolNames.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <Input value={props.commandArgs} onChange={(e) => props.setCommandArgs(e.target.value)} placeholder="command args" />
      <Button onClick={props.onRun}>{props.runLabel}</Button>
    </div>

    {props.cmdResult && (
      <div className="rounded-xl border border-white/10 p-3 space-y-2 text-sm font-mono">
        <div>exit code: {props.cmdResult.code}</div>
        <div>
          <div className="font-bold mb-1">stdout</div>
          <pre className="whitespace-pre-wrap break-words opacity-80">{props.cmdResult.stdout}</pre>
        </div>
        <div>
          <div className="font-bold mb-1">stderr</div>
          <pre className="whitespace-pre-wrap break-words opacity-80">{props.cmdResult.stderr}</pre>
        </div>
      </div>
    )}
  </div>
);
