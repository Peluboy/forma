export function EmptyProjectIllustration({
  className = "",
  size = 100,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="48" fill="var(--bg-muted)" fillOpacity="0.6" />
      <rect
        x="36"
        y="30"
        width="48"
        height="60"
        rx="6"
        fill="var(--bg-panel)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <path
        d="M44 42H64M44 50H76M44 58H68"
        stroke="var(--text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
      <circle cx="78" cy="74" r="16" fill="var(--accent)" />
      <path
        d="M78 68V80M72 74H84"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptySearchIllustration({
  className = "",
  size = 100,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="48" fill="var(--bg-muted)" fillOpacity="0.5" />
      <circle cx="54" cy="54" r="18" stroke="var(--accent)" strokeWidth="3" />
      <line
        x1="67"
        y1="67"
        x2="82"
        y2="82"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="54"
        cy="54"
        r="8"
        fill="var(--accent-muted)"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function EmptyWorkspaceIllustration({
  className = "",
  size = 100,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="48" fill="var(--bg-muted)" fillOpacity="0.6" />
      <rect
        x="34"
        y="40"
        width="52"
        height="48"
        rx="6"
        fill="var(--bg-panel)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <rect
        x="42"
        y="50"
        width="10"
        height="10"
        rx="2"
        fill="var(--accent-muted)"
      />
      <rect
        x="56"
        y="50"
        width="10"
        height="10"
        rx="2"
        fill="var(--accent-muted)"
      />
      <rect
        x="70"
        y="50"
        width="10"
        height="10"
        rx="2"
        fill="var(--accent-muted)"
      />
      <rect x="52" y="68" width="16" height="20" rx="2" fill="var(--accent)" />
    </svg>
  );
}
