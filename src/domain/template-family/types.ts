import type { ContentNodeType } from "../content/types.js";
import type {
  DesignElementType,
  DesignFamily,
  LayoutConstraints,
  Paint,
  TableCell,
  TextStyle,
} from "../design-spec/types.js";

export interface DesignTokenSet {
  colors: Record<string, string>;
  typography: Record<
    string,
    {
      fontFamily: string;
      fontSize: number;
      fontWeight?: number | string;
      lineHeight?: number;
      letterSpacing?: number;
      color?: string;
    }
  >;
  spacing: Record<string, number>;
  grid?: {
    columns?: number;
    margin?: number;
    gutter?: number;
  };
  radii?: Record<string, number>;
  strokes?: Record<string, number>;
  imageTreatment?: {
    borderRadius?: number;
    aspectRatio?: string;
    filter?: string;
  };
  metadata?: Record<string, unknown>;
}

export type TemplateSlotRole =
  | "kicker"
  | "heading"
  | "subheading"
  | "body"
  | "caption"
  | "quote"
  | "attribution"
  | "stat_value"
  | "stat_label"
  | "stat_description"
  | "table"
  | "chart"
  | "image"
  | "custom";

export interface TemplateSlot {
  id: string;
  name?: string;
  role?: TemplateSlotRole;
  accepts: ContentNodeType[];
  required?: boolean;
  minItems?: number;
  maxItems?: number;
  minCharacters?: number;
  maxCharacters?: number;
  preferredCharacters?: number;
  allowOverflow?: boolean;
  metadata?: Record<string, unknown>;
}

export interface TemplateElementDefinition {
  id: string;
  type: DesignElementType;
  slotId?: string; // If bound to a slot, content populates this element
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  hidden?: boolean;
  locked?: boolean;
  zIndex?: number;
  styleRef?: string;
  constraints?: LayoutConstraints;
  // Specific element defaults
  textStyle?: Partial<TextStyle>;
  shape?: "rectangle" | "rounded" | "ellipse" | "triangle" | "line" | "polygon";
  fill?: Paint;
  stroke?: Paint;
  strokeWidth?: number;
  fit?: "fill" | "fit" | "crop";
  assetRef?: string;
  columns?: number;
  headerRows?: number;
  rows?: TableCell[][];
  chartType?: "bar" | "line" | "pie";
  labels?: string[];
  data?: number[];
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface TemplateLayoutConstraints {
  maxPages?: number;
  preferredTextScaleRange?: [number, number];
  flexibleRegionId?: string;
  allowVariantSwitch?: boolean;
}

export interface TemplateLayout {
  id: string;
  name: string;
  role:
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
  preview?: string;
  description?: string;
  slots: TemplateSlot[];
  baseElements: TemplateElementDefinition[];
  fallbackLayouts?: string[]; // Compatible layouts for fit switching
  compatibleAlternatives?: string[]; // Compatible layouts for smart variant switching
  constraints?: TemplateLayoutConstraints;
  metadata?: Record<string, unknown>;
}

export interface TemplateFamily {
  version: "1.0";
  id: string;
  name: string;
  description?: string;
  family: DesignFamily;
  brandRef?: string;
  designTokens: DesignTokenSet;
  pageSize: {
    width: number;
    height: number;
    unit: "px" | "pt" | "in" | "mm";
  };
  layouts: TemplateLayout[];
  varietyRules?: Record<
    string,
    {
      visualDensity: "low" | "medium" | "high";
      visualType:
        "editorial" | "data" | "image" | "quote" | "table" | "section";
      repeatLimit: number;
      preferredPreviousTypes?: string[];
      avoidFollowingTypes?: string[];
    }
  >;
  metadata?: Record<string, unknown>;
}

export type TemplateFamilyIssue = {
  type:
    | "invalid_family"
    | "duplicate_layout_id"
    | "duplicate_slot_id"
    | "duplicate_element_id"
    | "invalid_slot_reference"
    | "unsupported_content_type"
    | "invalid_geometry"
    | "missing_required_slot";
  layoutId?: string;
  slotId?: string;
  elementId?: string;
  message: string;
};

export type TemplateFamilyValidation = {
  valid: boolean;
  issues: TemplateFamilyIssue[];
};
