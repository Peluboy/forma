import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumbs"
      className={`flex items-center text-xs select-none ${className}`}
    >
      <ol className="flex items-center gap-1.5 m-0 p-0 list-none">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="text-text-secondary hover:text-text-primary transition-colors font-medium"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={
                    isLast
                      ? "text-text-primary font-semibold"
                      : "text-text-secondary"
                  }
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  size={13}
                  className="text-text-tertiary shrink-0"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
