export type ToolInfo = {
  name: string;
  executable_path: string;
  installed: boolean;
};

export type ServiceStatus = {
  tool: string;
  running: boolean;
  pid?: number | null;
  follow_start: boolean;
};

export type InstallBody = {
  version?: string;
  download_url?: string;
  download_link?: string;
  archive_kind?: string;
  bin_path?: string;
  os?: string;
  arch?: string;
};

export type CmdResult = {
  code: number;
  stdout: string;
  stderr: string;
};
