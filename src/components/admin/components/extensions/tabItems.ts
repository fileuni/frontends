import type { ToolInfo } from './types.ts';

export type ExtensionTabItem = {
  key: string;
  label: string;
  installed: boolean;
};

export const buildExtensionTabItems = (tools: ToolInfo[]): ExtensionTabItem[] => {
  const order = ['openlist', 'rclone', 'cloudflared', 'tailscale', 'kopia'];
  return [...tools]
    .sort((a, b) => {
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    })
    .map((tool) => ({
      key: tool.name,
      label: tool.display_name,
      installed: tool.installed,
    }));
};
