import type { FileInfo } from '../types/index.ts';

interface FileListPagination {
  total?: number;
  total_pages?: number;
}

interface FileListEnvelope {
  items?: FileInfo[];
  data?: FileInfo[];
  pagination?: FileListPagination;
  total?: number;
}

export interface ParsedFileListResult {
  items: FileInfo[];
  total: number | null;
  totalPages: number | null;
}

export const parseFileListResult = (
  value: FileInfo[] | FileListEnvelope | unknown,
): ParsedFileListResult => {
  if (Array.isArray(value)) {
    return {
      items: value as FileInfo[],
      total: value.length,
      totalPages: 1,
    };
  }

  if (typeof value !== 'object' || value === null) {
    return {
      items: [],
      total: null,
      totalPages: null,
    };
  }

  const payload = value as FileListEnvelope;
  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  const total = typeof payload.total === 'number'
    ? payload.total
    : typeof payload.pagination?.total === 'number'
      ? payload.pagination.total
      : null;
  const totalPages = typeof payload.pagination?.total_pages === 'number'
    ? payload.pagination.total_pages
    : null;

  return {
    items,
    total,
    totalPages,
  };
};

export const extractFileListItems = (
  value: FileInfo[] | FileListEnvelope | unknown,
): FileInfo[] => {
  return parseFileListResult(value).items;
};
