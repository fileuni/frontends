export type ToolKind = 'service' | 'task' | 'both';

export type ToolRuntimeProfile = 'openlist' | 'rclone' | 'kopia' | 'cloudflared' | 'tailscale';

export type ToolInstallMode = 'managed_download' | 'existing_binary';

export type ToolBinaryView = {
  key: string;
  display_name: string;
  file_name: string;
  managed_path: string;
  configured_path?: string | null;
  resolved_path?: string | null;
  exists: boolean;
  is_service_binary: boolean;
  is_command_binary: boolean;
};

export type ToolIntegrationConfig = {
  tool: string;
  install_mode: ToolInstallMode;
  binaries: ToolBinaryView[];
};

export type ToolIntegrationConfigBody = {
  install_mode: ToolInstallMode;
  binaries: Array<{ key: string; path: string }>;
};

export type ToolInfo = {
  name: string;
  display_name: string;
  kind: ToolKind;
  runtime_profile: ToolRuntimeProfile;
  executable_path: string;
  install_dir: string;
  bin_path: string;
  installed: boolean;
  integration_mode: ToolInstallMode;
  binaries: ToolBinaryView[];
  homepage: string;
  description_zh: string;
  description_en: string;
};

export type ServiceStatus = {
  tool: string;
  kind: ToolKind;
  running: boolean;
  pid?: number | null;
  follow_start: boolean;
};

export type InstallBody = {
  version?: string;
  download_url?: string;
  download_link?: string;
  github_proxy?: string;
  archive_kind?: string;
  bin_path?: string;
  target_bin_dir?: string;
  os?: string;
  arch?: string;
};

export type CmdResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type ToolDiagnosticResult = {
  key: string;
  display_name: string;
  command: string;
  code: number;
  stdout: string;
  stderr: string;
};

export type OpenlistRuntimeConfig = {
  data_path: string;
  extra_args: string[];
  state_file_path: string;
  service_command: string;
};

export type OpenlistRuntimeConfigBody = {
  data_path: string;
  extra_args: string[];
};

export type RcloneRuntimeConfig = {
  config_path: string;
  rc_addr: string;
  rc_no_auth: boolean;
  extra_args: string[];
  mount_command_template: string;
  unmount_command_template: string;
  state_file_path: string;
  service_command: string;
};

export type RcloneRuntimeConfigBody = {
  config_path: string;
  rc_addr: string;
  rc_no_auth: boolean;
  extra_args: string[];
  mount_command_template: string;
  unmount_command_template: string;
};

export type KopiaRuntimeConfig = {
  config_file_path: string;
  cache_directory: string;
  repository_command_template: string;
  snapshot_command_template: string;
  state_file_path: string;
};

export type KopiaRuntimeConfigBody = {
  config_file_path: string;
  cache_directory: string;
  repository_command_template: string;
  snapshot_command_template: string;
};

export type CloudflaredServiceConfig = {
  tunnel_token: string;
  log_level: string;
  log_file: string;
  metrics: string;
  protocol: string;
  edge_ip_version: string;
  no_autoupdate: boolean;
  quick_tunnel_url: string;
  state_dir: string;
  state_file_path: string;
  token_file_path: string;
  service_command: string;
  quick_tunnel_command: string;
};

export type CloudflaredServiceConfigBody = {
  tunnel_token: string;
  log_level?: string;
  log_file?: string;
  metrics?: string;
  protocol?: string;
  edge_ip_version?: string;
  no_autoupdate?: boolean;
  quick_tunnel_url?: string;
};

export const createEmptyCloudflaredServiceConfig = (): CloudflaredServiceConfig => ({
  tunnel_token: '',
  log_level: 'info',
  log_file: '',
  metrics: '127.0.0.1:49312',
  protocol: 'auto',
  edge_ip_version: 'auto',
  no_autoupdate: true,
  quick_tunnel_url: 'http://127.0.0.1:8080',
  state_dir: '',
  state_file_path: '',
  token_file_path: '',
  service_command: '',
  quick_tunnel_command: '',
});

export type TailscaleRuntimeConfig = {
  state_dir: string;
  state_file: string;
  socket_path: string;
  tun_mode: string;
  udp_port: number;
  verbose: number;
  debug_addr: string;
  socks5_server: string;
  http_proxy_listen: string;
  no_logs_no_support: boolean;
  auth_key: string;
  auth_key_file_path: string;
  hostname: string;
  operator: string;
  login_server: string;
  accept_dns: boolean;
  accept_routes: boolean;
  advertise_exit_node: boolean;
  advertise_routes: string;
  advertise_tags: string;
  ssh: boolean;
  shields_up: boolean;
  state_file_path: string;
  daemon_command: string;
  up_command: string;
  up_args: string[];
  down_args: string[];
  status_args: string[];
  netcheck_args: string[];
};

export type TailscaleRuntimeConfigBody = {
  state_dir: string;
  state_file: string;
  socket_path: string;
  tun_mode: string;
  udp_port: number;
  verbose: number;
  debug_addr: string;
  socks5_server: string;
  http_proxy_listen: string;
  no_logs_no_support: boolean;
  auth_key: string;
  hostname: string;
  operator: string;
  login_server: string;
  accept_dns: boolean;
  accept_routes: boolean;
  advertise_exit_node: boolean;
  advertise_routes: string;
  advertise_tags: string;
  ssh: boolean;
  shields_up: boolean;
};

export const createEmptyIntegrationConfig = (tool: string): ToolIntegrationConfig => ({
  tool,
  install_mode: 'managed_download',
  binaries: [],
});

export const createEmptyOpenlistRuntimeConfig = (): OpenlistRuntimeConfig => ({
  data_path: '',
  extra_args: [],
  state_file_path: '',
  service_command: '',
});

export const createEmptyRcloneRuntimeConfig = (): RcloneRuntimeConfig => ({
  config_path: '',
  rc_addr: '127.0.0.1:5572',
  rc_no_auth: true,
  extra_args: [],
  mount_command_template: '${BinPath} mount remote: /mnt/remote --config=${ConfigFilePath}',
  unmount_command_template: 'fusermount -u /mnt/remote',
  state_file_path: '',
  service_command: '',
});

export const createEmptyKopiaRuntimeConfig = (): KopiaRuntimeConfig => ({
  config_file_path: '',
  cache_directory: '',
  repository_command_template: '${BinPath} repository connect filesystem --path /backup/repository --config-file=${ConfigFilePath} --cache-directory=${CacheDirectory}',
  snapshot_command_template: '${BinPath} snapshot create /data --config-file=${ConfigFilePath} --cache-directory=${CacheDirectory}',
  state_file_path: '',
});

export const createEmptyTailscaleRuntimeConfig = (): TailscaleRuntimeConfig => ({
  state_dir: '',
  state_file: '',
  socket_path: '',
  tun_mode: 'userspace-networking',
  udp_port: 0,
  verbose: 0,
  debug_addr: '',
  socks5_server: '',
  http_proxy_listen: '',
  no_logs_no_support: false,
  auth_key: '',
  auth_key_file_path: '',
  hostname: '',
  operator: '',
  login_server: '',
  accept_dns: true,
  accept_routes: false,
  advertise_exit_node: false,
  advertise_routes: '',
  advertise_tags: '',
  ssh: false,
  shields_up: false,
  state_file_path: '',
  daemon_command: '',
  up_command: '',
  up_args: [],
  down_args: [],
  status_args: [],
  netcheck_args: [],
});
