export type CopyPolicy = "exact" | "light_edit" | "rewrite_allowed";
export type ContentNodeType =
  | "document"
  | "section"
  | "heading"
  | "subheading"
  | "paragraph"
  | "list"
  | "list_item"
  | "quote"
  | "statistic"
  | "table"
  | "table_row"
  | "table_cell"
  | "caption"
  | "callout"
  | "cta"
  | "metadata"
  | "unknown";

export interface SourceSpan {
  id: string;
  start: number;
  end: number;
  text: string;
  blockId?: string;
  /** Syntax is represented in the graph but need not appear in the design. */
  role: "content" | "syntax";
  ignoredReason?: string;
}

export interface ContentNode {
  id: string;
  type: ContentNodeType;
  sourceSpanIds: string[];
  children?: ContentNode[];
  metadata?: Record<string, unknown>;
  confidence?: number;
}

export interface ContentGraph {
  version: "1.0";
  id: string;
  sourceId: string;
  sourceText: string;
  copyPolicy: CopyPolicy;
  spans: SourceSpan[];
  nodes: ContentNode[];
}

export type ContentValidationIssue = {
  type:
    | "gap"
    | "overlap"
    | "altered_span"
    | "unrepresented_span"
    | "unknown_span"
    | "duplicate_id";
  spanId?: string;
  nodeId?: string;
  message: string;
};

export type ContentValidationResult = {
  valid: boolean;
  issues: ContentValidationIssue[];
};
