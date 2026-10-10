import { monogram, nameHue } from "../lib/context";
import { cx } from "../lib/cx";

export interface AvatarProps {
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "circle" | "tile";
  className?: string;
}

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

/** Monogram with a stable soft gradient per name. */
export function Avatar({
  name,
  size = "sm",
  shape = "circle",
  className = "",
}: AvatarProps) {
  const hue = nameHue(name);
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-grid shrink-0 place-items-center font-bold tracking-[-0.02em] select-none",
        SIZES[size],
        shape === "circle" ? "rounded-full" : "rounded-[30%]",
        className,
      )}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 70% 88%), hsl(${(hue + 40) % 360} 65% 78%))`,
        color: `hsl(${hue} 45% 24%)`,
      }}
    >
      {monogram(name)}
    </span>
  );
}
