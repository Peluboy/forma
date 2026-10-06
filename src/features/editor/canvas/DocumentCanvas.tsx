import type {
  FlowDecorationElement,
  FlowDocument,
  FlowPage,
} from "../../../domain/design/flowDocument";
import { DOC_PAGE } from "../../../domain/design/flowDocument";
import {
  flowFrameText,
  wrapDocumentText,
} from "../../../domain/design/documentVisibility";

function textAnchor(
  align: "left" | "center" | "right" | "justify" | undefined,
) {
  if (align === "center") return "middle";
  if (align === "right") return "end";
  return "start";
}

function textX(el: {
  x: number;
  width: number;
  align?: "left" | "center" | "right" | "justify";
}) {
  if (el.align === "center") return el.x + el.width / 2;
  if (el.align === "right") return el.x + el.width;
  return el.x;
}

const CHART_PALETTE = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#dc2626",
  "#0891b2",
  "#4f46e5",
  "#db2777",
];

function Decoration({
  element,
  isSelected,
  onSelect,
  onUpdateFocalPoint,
}: {
  element: FlowDecorationElement;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onUpdateFocalPoint?: (id: string, fp: { x: number; y: number }) => void;
}) {
  const selectionOutline = isSelected ? (
    <rect
      x={element.x - 2}
      y={element.y - 2}
      width={element.width + 4}
      height={element.height + 4}
      fill="none"
      stroke="#2563eb"
      strokeWidth={2}
      strokeDasharray="4 3"
      pointerEvents="none"
      rx={4}
    />
  ) : null;

  if (element.type === "shape") {
    const fill = element.fill || "none";
    const stroke = element.stroke || "none";
    const sw = element.strokeWidth ?? (stroke !== "none" ? 1 : 0);
    const common = {
      opacity: element.opacity ?? 1,
      fill,
      stroke,
      strokeWidth: sw,
      cursor: onSelect ? "pointer" : "default",
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect?.(element.id);
      },
    };
    let shapeContent = null;
    if (element.shape === "line") {
      shapeContent = (
        <line
          x1={element.x}
          y1={element.y}
          x2={element.x + element.width}
          y2={element.y + element.height}
          stroke={stroke === "none" ? "#cbd5e1" : stroke}
          strokeWidth={element.strokeWidth ?? 1}
          opacity={element.opacity ?? 1}
          cursor={onSelect ? "pointer" : "default"}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(element.id);
          }}
        />
      );
    } else if (element.shape === "ellipse") {
      shapeContent = (
        <ellipse
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          rx={element.width / 2}
          ry={element.height / 2}
          {...common}
        />
      );
    } else if (element.shape === "triangle") {
      shapeContent = (
        <polygon
          points={`${element.x + element.width / 2},${element.y} ${element.x + element.width},${element.y + element.height} ${element.x},${element.y + element.height}`}
          {...common}
        />
      );
    } else {
      shapeContent = (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={element.shape === "rounded" ? 8 : 0}
          {...common}
        />
      );
    }
    return (
      <g>
        {shapeContent}
        {selectionOutline}
      </g>
    );
  }

  if (element.type === "image") {
    const fp = element.focalPoint || { x: 0.5, y: 0.5 };
    const rx = element.x + fp.x * element.width;
    const ry = element.y + fp.y * element.height;

    const alignX = fp.x < 0.35 ? "xMin" : fp.x > 0.65 ? "xMax" : "xMid";
    const alignY = fp.y < 0.35 ? "YMin" : fp.y > 0.65 ? "YMax" : "YMid";
    const preserveAspectRatio =
      element.fit === "fill"
        ? "none"
        : element.fit === "fit"
          ? "xMidYMid meet"
          : `${alignX}${alignY} slice`;

    const handleImageClick = (
      e: React.MouseEvent<SVGGElement | SVGSVGElement>,
    ) => {
      e.stopPropagation();
      if (!isSelected) {
        onSelect?.(element.id);
      } else if (onUpdateFocalPoint) {
        // User clicked inside selected image to move focal point
        const svg = (e.currentTarget as SVGElement).closest("svg.doc-page-svg");
        if (svg) {
          const pt = (svg as SVGSVGElement).createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          const ctm = (svg as SVGSVGElement).getScreenCTM();
          if (ctm) {
            const svgPt = pt.matrixTransform(ctm.inverse());
            const normX = Math.max(
              0,
              Math.min(1, (svgPt.x - element.x) / element.width),
            );
            const normY = Math.max(
              0,
              Math.min(1, (svgPt.y - element.y) / element.height),
            );
            onUpdateFocalPoint(element.id, {
              x: Math.round(normX * 100) / 100,
              y: Math.round(normY * 100) / 100,
            });
          }
        }
      }
    };

    const hasValidSrc =
      element.src &&
      (/^data:image\//.test(element.src) ||
        element.src.startsWith("http") ||
        element.src.startsWith("/") ||
        element.src.startsWith("blob:"));

    return (
      <g
        cursor={isSelected ? "crosshair" : onSelect ? "pointer" : "default"}
        onClick={handleImageClick}
      >
        {hasValidSrc ? (
          <svg
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            viewBox={`0 0 ${element.width} ${element.height}`}
            overflow="hidden"
            opacity={element.opacity ?? 1}
          >
            <image
              href={element.src}
              width={element.width}
              height={element.height}
              preserveAspectRatio={preserveAspectRatio}
            />
          </svg>
        ) : (
          <g opacity={element.opacity ?? 1}>
            <rect
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              rx={4}
              fill="#f1f5f9"
              stroke="#cbd5e1"
            />
            <text
              x={element.x + element.width / 2}
              y={element.y + element.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fill="#94a3b8"
            >
              {element.altText || "Image"}
            </text>
          </g>
        )}
        {selectionOutline}
        {isSelected && (
          <g pointerEvents="none" className="focal-reticle">
            <circle
              cx={rx}
              cy={ry}
              r={16}
              fill="rgba(37, 99, 235, 0.2)"
              stroke="#2563eb"
              strokeWidth={2}
            />
            <line
              x1={rx - 22}
              y1={ry}
              x2={rx + 22}
              y2={ry}
              stroke="#2563eb"
              strokeWidth={1.5}
            />
            <line
              x1={rx}
              y1={ry - 22}
              x2={rx}
              y2={ry + 22}
              stroke="#2563eb"
              strokeWidth={1.5}
            />
            <circle
              cx={rx}
              cy={ry}
              r={3.5}
              fill="#ffffff"
              stroke="#2563eb"
              strokeWidth={2}
            />
            <g
              transform={`translate(${rx}, ${ry > element.y + 35 ? ry - 26 : ry + 26})`}
            >
              <rect
                x={-42}
                y={-10}
                width={84}
                height={20}
                rx={10}
                fill="#0f172a"
                fillOpacity={0.88}
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9}
                fill="#ffffff"
                fontWeight={600}
              >
                Focal {Math.round(fp.x * 100)}%, {Math.round(fp.y * 100)}%
              </text>
            </g>
          </g>
        )}
      </g>
    );
  }

  // Chart rendering (bar, line, pie)
  const data = element.data?.length ? element.data : [40, 65, 85];
  const labels = element.labels?.length ? element.labels : [];
  const chartType = element.chartType || "bar";

  const handleChartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(element.id);
  };

  return (
    <g
      opacity={element.opacity ?? 1}
      cursor={onSelect ? "pointer" : "default"}
      onClick={handleChartClick}
    >
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rx={6}
        fill="#f8fafc"
        stroke="#e2e8f0"
      />
      {element.title && (
        <text
          x={element.x + 16}
          y={element.y + 24}
          fontSize={11}
          fontWeight={600}
          fill="#0f172a"
        >
          {element.title}
        </text>
      )}

      {chartType === "bar" &&
        (() => {
          const max = Math.max(10, ...data);
          const areaH = element.height - 70;
          const startX = element.x + 30;
          const step = (element.width - 60) / Math.max(1, data.length);
          const barWidth = Math.min(48, Math.max(12, step - 16));

          return (
            <g>
              {data.map((value, index) => {
                const barH = (value / max) * areaH;
                const bx = startX + index * step + (step - barWidth) / 2;
                const by = element.y + element.height - 35 - barH;
                return (
                  <g key={index}>
                    <rect
                      x={bx}
                      y={by}
                      width={barWidth}
                      height={barH}
                      rx={3}
                      fill={CHART_PALETTE[index % CHART_PALETTE.length]}
                    />
                    <text
                      x={bx + barWidth / 2}
                      y={by - 4}
                      textAnchor="middle"
                      fontSize={8.5}
                      fontWeight={500}
                      fill="#475569"
                    >
                      {value}
                    </text>
                    {labels[index] && (
                      <text
                        x={bx + barWidth / 2}
                        y={element.y + element.height - 18}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#64748b"
                      >
                        {labels[index]}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })()}

      {chartType === "line" &&
        (() => {
          const max = Math.max(10, ...data);
          const min = Math.min(0, ...data);
          const range = max - min || 1;
          const padX = 40;
          const padTop = element.title ? 42 : 24;
          const padBottom = 34;
          const plotW = element.width - padX * 2;
          const plotH = element.height - padTop - padBottom;

          const points = data.map((val, i) => {
            const px =
              element.x +
              padX +
              (data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2);
            const py =
              element.y + padTop + plotH - ((val - min) / range) * plotH;
            return { x: px, y: py, val, label: labels[i] };
          });

          const pointsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
          const baselineY = element.y + padTop + plotH;
          const areaStr = `${element.x + padX},${baselineY} ${pointsStr} ${points[points.length - 1]?.x ?? element.x + padX},${baselineY}`;

          return (
            <g>
              {/* Grid baseline */}
              <line
                x1={element.x + padX}
                y1={baselineY}
                x2={element.x + padX + plotW}
                y2={baselineY}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
              {/* Area polygon */}
              <polygon points={areaStr} fill="#2563eb" fillOpacity={0.12} />
              {/* Line */}
              <polyline
                points={pointsStr}
                fill="none"
                stroke="#2563eb"
                strokeWidth={2.5}
              />
              {/* Data points & labels */}
              {points.map((pt, i) => (
                <g key={i}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={4}
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  <text
                    x={pt.x}
                    y={pt.y - 7}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={600}
                    fill="#1e293b"
                  >
                    {pt.val}
                  </text>
                  {pt.label && (
                    <text
                      x={pt.x}
                      y={baselineY + 16}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#64748b"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })()}

      {chartType === "pie" &&
        (() => {
          const sum = data.reduce((acc, v) => acc + (v > 0 ? v : 0), 0) || 1;
          const cx = element.x + element.width * 0.38;
          const cy =
            element.y +
            (element.title ? 28 : 16) +
            (element.height - (element.title ? 28 : 16)) / 2;
          const radius = Math.min(
            element.width * 0.3,
            (element.height - 50) / 2,
          );

          let currentAngle = -Math.PI / 2;
          const slices = data.map((val, i) => {
            const sliceAngle = (Math.max(0, val) / sum) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle = endAngle;

            const x1 = cx + radius * Math.cos(startAngle);
            const y1 = cy + radius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(endAngle);
            const y2 = cy + radius * Math.sin(endAngle);
            const largeArc = sliceAngle > Math.PI ? 1 : 0;

            const pathData =
              data.length === 1 || sliceAngle >= 2 * Math.PI - 0.001
                ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 0 ${cx - radius} ${cy}`
                : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

            return {
              pathData,
              val,
              pct: Math.round((val / sum) * 100),
              color: CHART_PALETTE[i % CHART_PALETTE.length],
              label: labels[i] || `Item ${i + 1}`,
            };
          });

          const legendX = element.x + element.width * 0.68;
          const legendStartY = cy - (slices.length * 18) / 2;

          return (
            <g>
              {slices.map((slice, i) => (
                <path
                  key={i}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              ))}
              {slices.map((slice, i) => (
                <g
                  key={i}
                  transform={`translate(${legendX}, ${legendStartY + i * 20})`}
                >
                  <rect
                    x={0}
                    y={-4}
                    width={10}
                    height={10}
                    rx={2}
                    fill={slice.color}
                  />
                  <text
                    x={16}
                    y={4}
                    fontSize={9}
                    fill="#334155"
                    fontWeight={500}
                  >
                    {slice.label} ({slice.pct}%)
                  </text>
                </g>
              ))}
            </g>
          );
        })()}

      {selectionOutline}
    </g>
  );
}

export function DocumentPageView({
  flow,
  page,
  pageNumber,
  total,
  miniature,
  selectedLayer,
  onSelectLayer,
  onUpdateDecoration,
}: {
  flow: FlowDocument;
  page: FlowPage;
  pageNumber: number;
  total: number;
  miniature?: boolean;
  selectedLayer?: string | null;
  onSelectLayer?: (id: string | null) => void;
  onUpdateDecoration?: (
    pageId: string,
    decorationId: string,
    patch: Partial<FlowDecorationElement>,
  ) => void;
}) {
  const w = flow.pageSize?.width || DOC_PAGE.width;
  const h = flow.pageSize?.height || DOC_PAGE.height;
  const background = page.background || "#ffffff";
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={miniature ? "doc-page-thumb" : "doc-page-svg"}
      role="img"
      aria-label={`Document page ${pageNumber} of ${total}`}
    >
      <rect width={w} height={h} fill={background} stroke="#e4e2ec" />
      {(page.decorations || []).map((decoration) => (
        <Decoration
          key={decoration.id}
          element={decoration}
          isSelected={!miniature && selectedLayer === decoration.id}
          onSelect={!miniature ? onSelectLayer : undefined}
          onUpdateFocalPoint={
            !miniature && onUpdateDecoration
              ? (id, fp) => onUpdateDecoration(page.id, id, { focalPoint: fp })
              : undefined
          }
        />
      ))}
      {flow.master.header && (
        <text
          x={54}
          y={36}
          fontSize={miniature ? 8 : 10}
          fill="#92929f"
          fontFamily="Arial"
        >
          {flow.master.header}
        </text>
      )}
      {page.elements.map((el) => {
        if (el.type === "table") {
          const rowH = el.height / Math.max(1, el.rows.length);
          return (
            <g key={el.id}>
              {el.rows.map((row, ri) => (
                <g key={ri}>
                  <rect
                    x={el.x}
                    y={el.y + ri * rowH}
                    width={el.width}
                    height={rowH}
                    fill={ri < 1 && el.headerRow ? "#f3f1fa" : "#fff"}
                    stroke="#d8d5e4"
                  />
                  {row.map((cell, ci) => (
                    <text
                      key={ci}
                      x={el.x + 6 + (ci * el.width) / Math.max(1, row.length)}
                      y={el.y + ri * rowH + rowH * 0.65}
                      fontSize={miniature ? 6 : 10}
                      fontFamily="Arial"
                      fill="#252920"
                    >
                      {cell || ""}
                    </text>
                  ))}
                </g>
              ))}
              {el.overflow && (
                <text
                  x={el.x}
                  y={el.y + el.height + 12}
                  fontSize={9}
                  fill="#b42318"
                >
                  Table overflow
                </text>
              )}
            </g>
          );
        }
        const text = flowFrameText(flow, el) || "";
        const lines = wrapDocumentText(text, el.width, el.fontSize);
        const lineHeight =
          el.lineHeight && el.lineHeight > 0 ? el.lineHeight : 1.35;
        return (
          <g key={el.id}>
            {lines.map((line, i) => (
              <text
                key={i}
                x={textX(el)}
                y={el.y + el.fontSize + i * el.fontSize * lineHeight}
                fontSize={
                  miniature ? Math.min(8, el.fontSize * 0.4) : el.fontSize
                }
                fontFamily={el.fontFamily}
                fill={el.color}
                fontWeight={el.fontWeight ?? (el.fontSize >= 18 ? 600 : 400)}
                letterSpacing={el.letterSpacing ?? 0}
                textAnchor={textAnchor(el.align)}
              >
                {line || "\u00a0"}
              </text>
            ))}
            {el.overflow && (
              <text
                x={el.x}
                y={el.y + el.height + 12}
                fontSize={9}
                fill="#b42318"
              >
                Text overflow — content preserved in source
              </text>
            )}
          </g>
        );
      })}
      {(flow.master.showPageNumbers || flow.master.footer) && (
        <text
          x={w / 2}
          y={h - 28}
          textAnchor="middle"
          fontSize={miniature ? 7 : 10}
          fill="#92929f"
          fontFamily="Arial"
        >
          {[
            flow.master.footer,
            flow.master.showPageNumbers ? `${pageNumber} / ${total}` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </text>
      )}
    </svg>
  );
}
