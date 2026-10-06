import type { CopyPolicy } from "../content/types.js";

export type DesignFamily = "graphic" | "document" | "presentation";
export type PageRole =
  | "cover"
  | "intro"
  | "section"
  | "content"
  | "stats"
  | "quote"
  | "table"
  | "chart"
  | "closing"
  | "custom";
export type Paint = { color: string };
export type DesignElementType =
  "text" | "image" | "shape" | "frame" | "table" | "chart" | "group";

export interface LayoutConstraints {
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minFontSize?: number;
  maxFontSize?: number;
  allowResize?: boolean;
  allowMove?: boolean;
  allowReflow?: boolean;
  preserveAspectRatio?: boolean;
}

export interface ElementProvenance {
  origin: "user" | "legacy_adapter" | "template" | "ai" | "system";
  sourceSpanIds?: string[];
  templateId?: string;
  generatorVersion?: string;
  /** Legacy copy cannot always be aligned to raw manuscript after prior edits. */
  unavailable?: boolean;
}

export interface BaseElement {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
  parentId?: string;
  sourceSpanIds?: string[];
  styleRef?: string;
  constraints?: LayoutConstraints;
  provenance?: ElementProvenance;
  metadata?: Record<string, unknown>;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
}
export interface TextRun {
  text: string;
  styleRef?: string;
}
export interface TextElement extends BaseElement, TextStyle {
  type: "text";
  text: string;
  runs?: TextRun[];
  verticalAlign?: "top" | "middle" | "bottom";
  paragraphSpacing?: number;
  overflow?: "visible" | "clip" | "reflow" | "warn";
}
export interface DesignAssetRef {
  id: string;
  kind: "image";
  uri?: string;
  mimeType?: string;
  /** Temporary legacy adapter bridge; object storage is a later milestone. */
  legacyInline?: boolean;
}
export interface ImageElement extends BaseElement {
  type: "image";
  assetRef: string;
  fit: "fill" | "fit" | "crop";
  crop?: { x: number; y: number; width: number; height: number };
  focalPoint?: { x: number; y: number };
  altText?: string;
  frameId?: string;
}
export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: "rectangle" | "rounded" | "ellipse" | "triangle" | "line" | "polygon";
  fill?: Paint;
  stroke?: Paint;
  strokeWidth?: number;
}
export interface FrameElement extends BaseElement {
  type: "frame";
  shape: "rectangle" | "rounded" | "ellipse";
  assetRef?: string;
  fit: "fill" | "fit" | "crop";
}
export interface TableCell {
  text: string;
  sourceSpanIds?: string[];
  styleRef?: string;
}
export interface TableElement extends BaseElement {
  type: "table";
  columns: number;
  rows: TableCell[][];
  headerRows: number;
  /** Per-cell manuscript provenance override (row → cell → span ids). */
  cellSourceSpanIds?: string[][][];
}
export interface ChartElement extends BaseElement {
  type: "chart";
  chartType: "bar" | "line" | "pie";
  labels: string[];
  data: number[];
  title?: string;
}
export interface GroupElement extends BaseElement {
  type: "group";
  childIds: string[];
}
export type DesignElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | FrameElement
  | TableElement
  | ChartElement
  | GroupElement;

export interface DesignStyleRegistry {
  colors?: Record<string, string>;
  textStyles?: Record<string, TextStyle>;
  spacing?: Record<string, number>;
}
export interface DesignPage {
  id: string;
  name?: string;
  role?: PageRole;
  width: number;
  height: number;
  background?: Paint;
  elementIds: string[];
  elements: DesignElement[];
  metadata?: Record<string, unknown>;
}
export interface DesignSpec {
  version: "1.0";
  id: string;
  name: string;
  family: DesignFamily;
  copyPolicy: CopyPolicy;
  documentSize: {
    width: number;
    height: number;
    unit: "px" | "pt" | "in" | "mm";
  };
  pages: DesignPage[];
  styles?: DesignStyleRegistry;
  assets?: DesignAssetRef[];
  metadata?: Record<string, unknown>;
}

export type DesignSpecIssue = {
  type:
    | "invalid_root"
    | "duplicate_id"
    | "missing_element"
    | "invalid_geometry"
    | "invalid_parent"
    | "group_cycle"
    | "invalid_asset_ref"
    | "invalid_style_ref"
    | "malformed_table"
    | "copy_policy"
    | "invalid_element";
  pageId?: string;
  elementId?: string;
  message: string;
};
export type DesignSpecValidation = {
  valid: boolean;
  issues: DesignSpecIssue[];
};
export type AdapterResult = { spec: DesignSpec; warnings: string[] };
