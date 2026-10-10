export function ReportDocumentIllustration({
  className = "",
  size = 120,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="24"
        y="20"
        width="112"
        height="124"
        rx="8"
        fill="var(--bg-panel)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      {/* Decorative page header */}
      <rect
        x="36"
        y="34"
        width="56"
        height="8"
        rx="3"
        fill="var(--accent)"
        fillOpacity="0.8"
      />
      <rect
        x="36"
        y="48"
        width="88"
        height="4"
        rx="2"
        fill="var(--text-tertiary)"
        fillOpacity="0.4"
      />
      <rect
        x="36"
        y="56"
        width="76"
        height="4"
        rx="2"
        fill="var(--text-tertiary)"
        fillOpacity="0.3"
      />

      {/* Grid columns */}
      <rect
        x="36"
        y="70"
        width="40"
        height="48"
        rx="4"
        fill="var(--bg-muted)"
      />
      <rect
        x="84"
        y="70"
        width="40"
        height="48"
        rx="4"
        fill="var(--bg-muted)"
      />
      <rect
        x="42"
        y="76"
        width="28"
        height="3"
        rx="1.5"
        fill="var(--text-tertiary)"
        fillOpacity="0.5"
      />
      <rect
        x="42"
        y="83"
        width="24"
        height="3"
        rx="1.5"
        fill="var(--text-tertiary)"
        fillOpacity="0.3"
      />
      <rect
        x="90"
        y="76"
        width="28"
        height="3"
        rx="1.5"
        fill="var(--text-tertiary)"
        fillOpacity="0.5"
      />
      <rect
        x="90"
        y="83"
        width="24"
        height="3"
        rx="1.5"
        fill="var(--text-tertiary)"
        fillOpacity="0.3"
      />

      {/* Accent badge */}
      <circle cx="120" cy="128" r="14" fill="var(--accent)" />
      <path
        d="M116 128L119 131L125 125"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SlideDocumentIllustration({
  className = "",
  size = 120,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="16"
        y="34"
        width="128"
        height="88"
        rx="8"
        fill="var(--bg-panel)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <rect
        x="28"
        y="46"
        width="48"
        height="7"
        rx="3"
        fill="var(--accent)"
        fillOpacity="0.85"
      />
      <rect
        x="28"
        y="58"
        width="64"
        height="4"
        rx="2"
        fill="var(--text-tertiary)"
        fillOpacity="0.4"
      />
      <rect
        x="28"
        y="72"
        width="48"
        height="38"
        rx="4"
        fill="var(--bg-muted)"
      />
      <rect
        x="84"
        y="72"
        width="48"
        height="38"
        rx="4"
        fill="var(--accent-muted)"
        fillOpacity="0.5"
      />
    </svg>
  );
}

export function GraphicDocumentIllustration({
  className = "",
  size = 120,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="28"
        y="24"
        width="104"
        height="112"
        rx="10"
        fill="var(--bg-panel)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <rect
        x="40"
        y="38"
        width="80"
        height="46"
        rx="6"
        fill="var(--accent-muted)"
      />
      <circle cx="60" cy="56" r="8" fill="var(--accent)" fillOpacity="0.4" />
      <path
        d="M48 76L64 64L82 76L98 60L112 76"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect
        x="40"
        y="94"
        width="52"
        height="6"
        rx="3"
        fill="var(--text-primary)"
        fillOpacity="0.8"
      />
      <rect
        x="40"
        y="106"
        width="68"
        height="4"
        rx="2"
        fill="var(--text-tertiary)"
        fillOpacity="0.4"
      />
    </svg>
  );
}
