export interface ProjectRecord {
  id: string;
  name: string;
  source_code: string;
  language: string;
  ast_cache: string | null;
  layout_cache: string | null;
  layout_params: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiffRecord {
  id: string;
  project_id: string;
  source_a: string;
  source_b: string;
  result: string;
  timestamp: string;
}
