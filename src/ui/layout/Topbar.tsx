import { type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { FormaLogo } from "../art/FormaLogo";
import { IconButton } from "../primitives/IconButton";
import { Avatar } from "../primitives/Avatar";
import { ThemeToggle } from "../../shared/components/ThemeToggle";
import { cx } from "../lib/cx";

export function Topbar({
  trail,
  actions,
  userName,
  userHref,
  menuOpen,
  onToggleMenu,
  className = "",
}: {
  trail?: ReactNode;
  actions?: ReactNode;
  userName?: string;
  userHref?: string;
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  className?: string;
}) {
  return (
    <header
      className={cx(
        "flex h-[var(--topbar-height)] items-center justify-between gap-4 border-b border-border bg-bg-panel/90 px-4 backdrop-blur-md md:px-8",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {onToggleMenu && (
          <IconButton
            className="md:hidden"
            label={menuOpen ? "Close menu" : "Open menu"}
            onClick={onToggleMenu}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </IconButton>
        )}
        <a href="/dashboard" className="md:hidden">
          <FormaLogo size={22} />
        </a>
        {trail && (
          <div className="hidden min-w-0 truncate text-[13px] text-text-secondary md:block">
            {trail}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <span className="md:hidden">
          <ThemeToggle compact />
        </span>
        <a
          href={userHref || "/account"}
          className="inline-flex items-center gap-2 rounded-full py-1 pr-1 pl-2 text-[13px] font-medium text-text-secondary no-underline hover:bg-bg-muted hover:text-text-primary"
        >
          <span className="hidden sm:inline">{userName || "Sign in"}</span>
          <Avatar name={userName || "Guest"} size="sm" />
        </a>
      </div>
    </header>
  );
}
