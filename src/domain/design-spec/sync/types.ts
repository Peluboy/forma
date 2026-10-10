export const DESIGNSPEC_SYNC_VERSION = "1.0";
export const PROJECTION_VERSION = "1.0";

export type DesignSpecSyncStatus =
  | "in_sync"
  | "sync_with_approximations"
  | "stale"
  | "unsupported_edit_detected"
  | "missing_design_spec";

export type EditorChangeSource =
  "user" | "system" | "quality_fix" | "layout_switch" | "import";

export type EditorChangeKind =
  | "text_content"
  | "text_style"
  | "element_moved"
  | "element_resized"
  | "shape_style"
  | "image_fit"
  | "image_focal"
  | "table_cell"
  | "chart_data"
  | "page_background"
  | "element_added"
  | "element_deleted"
  | "page_added"
  | "page_deleted"
  | "page_hidden"
  | "unsupported";

export interface DesignSpecLink {
  designSpecId: string;
  designSpecPageId: string;
  designSpecElementId?: string;
  sourceSpanIds?: string[];
  projectionId?: string;
  projectionVersion?: string;
}

export interface DesignSpecSyncWarning {
  code: string;
  message: string;
  pageId?: string;
  elementId?: string;
}

export interface DesignSpecSyncBlocker {
  code: string;
  message: string;
  pageId?: string;
  elementId?: string;
}

export interface DesignSpecSyncIssue {
  code: string;
  message: string;
  pageId?: string;
  elementId?: string;
  severity: "warning" | "blocker";
}

export interface DesignSpecSyncState {
  version: "1.0";
  designSpecId: string;
  projectId: string;
  status: DesignSpecSyncStatus;
  lastSyncedAt?: string;
  lastEditorChangeAt?: string;
  supportedEditCount: number;
  unsupportedEditCount: number;
  warnings: DesignSpecSyncWarning[];
  blockers: DesignSpecSyncBlocker[];
  lastKnownHash?: string;
  currentEditorHash?: string;
  copyChanged?: boolean;
  recentOperations?: Array<{
    kind: EditorChangeKind;
    pageId?: string;
    elementId?: string;
    at: string;
  }>;
}

export interface EditorChangeBase {
  kind: EditorChangeKind;
  projectId: string;
  pageId?: string;
  editorElementId?: string;
  linkedDesignSpecElementId?: string;
  designSpecPageId?: string;
  timestamp: string;
  source: EditorChangeSource;
}

export interface TextContentChanged extends EditorChangeBase {
  kind: "text_content";
  previousText?: string;
  nextText: string;
  sourceLocked?: boolean;
}

export interface TextStyleChanged extends EditorChangeBase {
  kind: "text_style";
  patch: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    align?: "left" | "center" | "right" | "justify";
    lineHeight?: number;
    letterSpacing?: number;
  };
}

export interface ElementMoved extends EditorChangeBase {
  kind: "element_moved";
  x: number;
  y: number;
}

export interface ElementResized extends EditorChangeBase {
  kind: "element_resized";
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export interface ShapeStyleChanged extends EditorChangeBase {
  kind: "shape_style";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  cornerRadius?: number;
}

export interface ImageFitChanged extends EditorChangeBase {
  kind: "image_fit";
  fit: "fill" | "fit" | "crop";
}

export interface ImageFocalPointChanged extends EditorChangeBase {
  kind: "image_focal";
  focalPoint: { x: number; y: number };
  altText?: string;
}

export interface TableCellChanged extends EditorChangeBase {
  kind: "table_cell";
  row: number;
  column: number;
  nextText: string;
  sourceLocked?: boolean;
  headerRow?: boolean;
}

export interface ChartDataChanged extends EditorChangeBase {
  kind: "chart_data";
  title?: string;
  labels?: string[];
  data?: number[];
  chartType?: "bar" | "line" | "pie";
  sourceLocked?: boolean;
}

export interface PageBackgroundChanged extends EditorChangeBase {
  kind: "page_background";
  color: string;
}

export interface ElementAdded extends EditorChangeBase {
  kind: "element_added";
  elementType: string;
}

export interface ElementDeleted extends EditorChangeBase {
  kind: "element_deleted";
}

export interface PageAdded extends EditorChangeBase {
  kind: "page_added";
  width?: number;
  height?: number;
}

export interface PageDeleted extends EditorChangeBase {
  kind: "page_deleted";
}

export interface PageHiddenChanged extends EditorChangeBase {
  kind: "page_hidden";
  hidden: boolean;
}

export interface UnsupportedEditorChange extends EditorChangeBase {
  kind: "unsupported";
  reason: string;
}

export type EditorChangeOperation =
  | TextContentChanged
  | TextStyleChanged
  | ElementMoved
  | ElementResized
  | ShapeStyleChanged
  | ImageFitChanged
  | ImageFocalPointChanged
  | TableCellChanged
  | ChartDataChanged
  | PageBackgroundChanged
  | ElementAdded
  | ElementDeleted
  | PageAdded
  | PageDeleted
  | PageHiddenChanged
  | UnsupportedEditorChange;

export interface DesignSpecSyncResult {
  spec: import("../types.js").DesignSpec;
  state: DesignSpecSyncState;
  issues: DesignSpecSyncIssue[];
  applied: boolean;
}
