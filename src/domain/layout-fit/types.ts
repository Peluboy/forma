export interface TextFitMeasurement {
  elementId: string;
  slotId?: string;
  fontSize: number;
  minFontSize: number;
  maxFontSize: number;
  availableWidth: number;
  availableHeight: number;
  lineCount: number;
  lineHeight: number;
  measuredHeight: number;
  overflow: boolean;
  overflowAmount: number; // in pt/px
}

export type FitActionType =
  | "keep_typography"
  | "scale_font"
  | "expand_region"
  | "switch_layout"
  | "continuation_page"
  | "unresolved_overflow";

export interface FitAction {
  type: FitActionType;
  elementId?: string;
  pageId: string;
  description: string;
  applied: boolean;
  params?: {
    originalFontSize?: number;
    newFontSize?: number;
    originalHeight?: number;
    newHeight?: number;
    alternateLayoutId?: string;
    overflowAmount?: number;
  };
}

export interface PageFitReport {
  pageId: string;
  layoutId: string;
  measurements: TextFitMeasurement[];
  actions: FitAction[];
  resolved: boolean;
}

export interface DocumentFitReport {
  valid: boolean;
  pages: PageFitReport[];
  totalOverflows: number;
  repairedCount: number;
  unresolvedCount: number;
}
