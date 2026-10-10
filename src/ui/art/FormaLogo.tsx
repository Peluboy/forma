import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  showText?: boolean;
}

export function FormaLogo({
  size = 28,
  showText = true,
  className = "",
  ...props
}: LogoProps) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 font-[var(--font-ui)] select-none ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        {...props}
      >
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <path
          d="M8 10C8 8.89543 8.89543 8 10 8H22C23.1046 8 24 8.89543 24 10V14C24 15.1046 23.1046 16 22 16H10C8.89543 16 8 15.1046 8 14V10Z"
          fill="white"
          fillOpacity="0.95"
        />
        <rect
          x="8"
          y="19"
          width="7"
          height="5"
          rx="2"
          fill="white"
          fillOpacity="0.75"
        />
        <rect
          x="18"
          y="19"
          width="6"
          height="5"
          rx="2"
          fill="white"
          fillOpacity="0.95"
        />
      </svg>
      {showText && (
        <span className="text-[17px] font-bold tracking-tight text-text-primary">
          Forma
        </span>
      )}
    </div>
  );
}
