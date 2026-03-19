import type { ToolInfo } from './types.ts';

export type ExtensionTabItem = {
  key: string;
  label: string;
  installed: boolean;
};

const labelForTool = (name: string): string => {
  if (name === 'openlist') return 'OpenList';
  if (name === 'rclone') return 'Rclone';
  return name.length > 0 ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : name;
};

export const buildExtensionTabItems = (tools: ToolInfo[]): ExtensionTabItem[] => {
  const order = ['openlist', 'rclone', 'kopia'];
  return [...tools]
    .sort((a, b) => {
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    })
    .map((tool) => ({
      key: tool.name,
      label: labelForTool(tool.name),
      installed: tool.installed,
    }));
};
