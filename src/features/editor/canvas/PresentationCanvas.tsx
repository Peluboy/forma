import type {
  PresentationDeck,
  Slide,
  SlideChart,
} from "../../../domain/design/presentation";
import {
  contentSlideLines,
  wrapSlideText,
  SLIDE_SIZE,
} from "../../../domain/design/presentation";

function ChartBars({
  chart,
  x,
  y,
  width,
  height,
  accent,
}: {
  chart: SlideChart;
  x: number;
  y: number;
  width: number;
  height: number;
  accent: string;
}) {
  const max = Math.max(1, ...chart.series.flatMap((s) => s.values));
  const groupWidth = width / Math.max(1, chart.categories.length);
  const barWidth = (groupWidth * 0.7) / Math.max(1, chart.series.length);
  return (
    <g>
      <text x={x} y={y - 8} fontSize={14} fill={accent} fontFamily="Arial">
        {chart.title}
      </text>
      {chart.categories.map((cat, ci) => {
        const gx = x + ci * groupWidth;
        return (
          <g key={cat + ci}>
            {chart.series.map((series, si) => {
              const value = series.values[ci] || 0;
              const h = (value / max) * (height - 28);
              const bx = gx + groupWidth * 0.15 + si * barWidth;
              return (
                <rect
                  key={series.name}
                  x={bx}
                  y={y + height - 20 - h}
                  width={barWidth - 2}
                  height={h}
                  fill={accent}
                  opacity={1 - si * 0.25}
                />
              );
            })}
            <text
              x={gx + groupWidth / 2}
              y={y + height - 4}
              textAnchor="middle"
              fontSize={11}
              fill="#444"
              fontFamily="Arial"
            >
              {cat}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function SlideView({
  deck,
  slide,
  miniature = false,
}: {
  deck: PresentationDeck;
  slide: Slide;
  miniature?: boolean;
}) {
  const { width, height } = deck.pageSize;
  const theme = deck.theme;
  const scale = miniature ? 0.18 : 1;
  const content = contentSlideLines(slide);
  const titleLines = wrapSlideText(
    slide.title,
    slide.layout === "title" ? 36 : 48,
  );
  const contentStart = 100 + Math.max(0, content.title.length - 1) * 34;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={Math.round(width * scale)}
      height={Math.round(height * scale)}
      role="img"
      aria-label={slide.title || "Slide"}
      style={{ background: theme.background, display: "block" }}
    >
      <rect width={width} height={height} fill={theme.background} />
      <rect x={0} y={0} width={8} height={height} fill={theme.accent} />
      {slide.layout === "title" && (
        <>
          <text
            x={width / 2}
            y={190}
            textAnchor="middle"
            fontSize={42}
            fontWeight={700}
            fill={theme.text}
            fontFamily="Georgia, serif"
          >
            {titleLines.map((line, index) => (
              <tspan key={index} x={width / 2} dy={index ? 48 : 0}>
                {line}
              </tspan>
            ))}
          </text>
          {slide.body ? (
            <text
              x={width / 2}
              y={340}
              textAnchor="middle"
              fontSize={20}
              fill={theme.text}
              fontFamily="Arial"
            >
              {wrapSlideText(slide.body, 80).map((line, index) => (
                <tspan key={index} x={width / 2} dy={index ? 25 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          ) : null}
        </>
      )}
      {slide.layout === "section" && (
        <>
          <text
            x={64}
            y={210}
            fontSize={36}
            fontWeight={700}
            fill={theme.accent}
            fontFamily="Georgia, serif"
          >
            {titleLines.map((line, index) => (
              <tspan key={index} x={64} dy={index ? 42 : 0}>
                {line}
              </tspan>
            ))}
          </text>
          {slide.body && (
            <text
              x={64}
              y={345}
              fontSize={18}
              fill={theme.text}
              fontFamily="Arial"
            >
              {wrapSlideText(slide.body, 80).map((line, index) => (
                <tspan key={index} x={64} dy={index ? 23 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          )}
        </>
      )}
      {(slide.layout === "content" || slide.layout === "two-column") && (
        <text
          x={48}
          y={56}
          fontSize={28}
          fontWeight={700}
          fill={theme.text}
          fontFamily="Georgia, serif"
        >
          {(slide.layout === "content" ? content.title : [slide.title]).map(
            (line, index) => (
              <tspan key={index} x={48} dy={index ? 34 : 0}>
                {line}
              </tspan>
            ),
          )}
        </text>
      )}
      {slide.layout === "content" && (
        <>
          {content.copy.map((line, i) => (
            <text
              key={i}
              x={48}
              y={contentStart + i * 20}
              fontSize={16}
              fill={theme.text}
              fontFamily="Arial"
            >
              {line}
            </text>
          ))}
        </>
      )}
      {slide.layout === "two-column" && (
        <>
          {(slide.body || slide.bullets.map((b) => `• ${b}`).join("\n"))
            .split("\n")
            .filter(Boolean)
            .map((line, i) => (
              <text
                key={`l${i}`}
                x={48}
                y={100 + i * 24}
                fontSize={16}
                fill={theme.text}
                fontFamily="Arial"
              >
                {line}
              </text>
            ))}
          {slide.secondary
            .split("\n")
            .filter(Boolean)
            .map((line, i) => (
              <text
                key={`r${i}`}
                x={500}
                y={100 + i * 24}
                fontSize={16}
                fill={theme.text}
                fontFamily="Arial"
              >
                {line}
              </text>
            ))}
        </>
      )}
      {slide.layout === "chart" && (
        <>
          <text
            x={48}
            y={56}
            fontSize={28}
            fontWeight={700}
            fill={theme.text}
            fontFamily="Georgia, serif"
          >
            {slide.title || "Chart"}
          </text>
          {slide.chart ? (
            <ChartBars
              chart={slide.chart}
              x={64}
              y={100}
              width={SLIDE_SIZE.width - 120}
              height={360}
              accent={theme.accent}
            />
          ) : (
            <text x={48} y={120} fontSize={16} fill="#a33" fontFamily="Arial">
              Chart needs a numeric data table.
            </text>
          )}
        </>
      )}
    </svg>
  );
}
