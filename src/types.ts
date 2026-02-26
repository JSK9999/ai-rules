export interface MetaSource {
  name: string;
  url?: string;
  type: 'builtin' | 'external';
}

export interface DotrulesMeta {
  version: string;
  mode?: 'symlink' | 'copy'; // deprecated: kept for migration, always 'copy' going forward
  sources: MetaSource[];
  tools?: string[];
  template?: string | null;
  selectedFiles?: Record<string, string[]>;
  fileHashes?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
