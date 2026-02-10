export interface MetaSource {
  name: string;
  url?: string;
  type: 'builtin' | 'external';
}

export interface DotrulesMeta {
  version: string;
  mode: 'symlink' | 'copy';
  sources: MetaSource[];
  tools?: string[];
  template?: string | null;
  selectedFiles?: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}
