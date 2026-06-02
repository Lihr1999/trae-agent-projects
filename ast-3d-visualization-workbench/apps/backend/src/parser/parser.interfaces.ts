export interface ASTNode {
  id: string;
  type: string;
  text: string;
  startIndex: number;
  endIndex: number;
  children: ASTNode[];
  hasError?: boolean;
  isErrorPlaceholder?: boolean;
}

export interface ParseResult {
  ast: ASTNode;
  language: string;
  nodeCount: number;
  errorCount: number;
  parseTime: number;
  hasErrors: boolean;
  errorMessage?: string;
}

export interface IncrementalParseRequest {
  source: string;
  language: string;
  previousSource?: string;
  editStartIndex?: number;
  editOldEndIndex?: number;
  editNewEndIndex?: number;
}
