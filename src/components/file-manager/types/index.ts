export interface FileInfo {
  id?: string; // Unique identifier, share ID for shares
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string;
  favorite_color: number;
  has_active_share?: boolean;
  has_active_direct?: boolean;
  trashed_at?: string;
  original_path?: string;
  accessed_at?: string; // Browser access timestamp
  mount_id?: string;
  mount_name?: string;
  mount_driver?: string;
  mount_dir?: string;
  is_mount_root?: boolean;
  mount_sync_status?: string;
  mount_last_sync_at?: string;
  mount_next_sync_at?: string;
  mount_last_error?: string;
  delete_behavior?: 'trash' | 'remote_direct';

  // Share specific fields (optional)
  view_count?: number;
  max_downloads?: number;
  expire_at?: string;
  has_password?: boolean;
   is_public?: boolean;
  enable_direct?: boolean;
  can_upload?: boolean;
  can_update_no_create?: boolean;
  can_delete?: boolean;
  created_at?: string; // For shares, this is the start of sharing
  file_index_id?: string;
  user_id?: string;
  file_name?: string;
  file_path?: string;
  note?: string;
  label?: string;
  attributes?: string;
  hide_download?: boolean;
  snapshot_path?: string;
  snapshot_name?: string;
  snapshot_is_dir?: boolean;
  is_deleted?: boolean;
}

export type ViewMode = 'grid' | 'list';
export type FileManagerMode = 'files' | 'recent' | 'trash' | 'favorites' | 'shares';

export interface StorageStats {
  used: number;
  quota: number;
}

export interface ClipboardItem {
  path: string;
  name: string;
  is_dir: boolean;
  type: 'copy' | 'cut';
  mount_id?: string;
  mount_dir?: string;
  is_mount_root?: boolean;
  delete_behavior?: 'trash' | 'remote_direct';
}
