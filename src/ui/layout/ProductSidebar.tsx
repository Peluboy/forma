import { type ReactNode } from "react";
import {
  Building2,
  CircleHelp,
  LayoutGrid,
  LayoutTemplate,
  Settings,
  Sparkles,
} from "lucide-react";
import { FormaLogo } from "../art/FormaLogo";
import { Button } from "../primitives/Button";
import { Avatar } from "../primitives/Avatar";
import { cx } from "../lib/cx";
import { ThemeToggle } from "../../shared/components/ThemeToggle";

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface ProductSidebarProps {
  activeNavId?: string;
  scopeName?: string;
  scopeDetail?: string;
  userName?: string;
  userHref?: string;
  guest?: boolean;
  createHref?: string;
  extraNav?: SidebarNavItem[];
}

const MAIN: SidebarNavItem[] = [
  {
    id: "designs",
    label: "My designs",
    href: "/dashboard",
    icon: <LayoutGrid size={18} />,
  },
  {
    id: "create",
    label: "Create",
    href: "/create",
    icon: <Sparkles size={18} />,
  },
  {
    id: "templates",
    label: "Templates",
    href: "/templates",
    icon: <LayoutTemplate size={18} />,
  },
  {
    id: "workspaces",
    label: "Workspaces",
    href: "/workspaces",
    icon: <Building2 size={18} />,
  },
];

const FOOT: SidebarNavItem[] = [
  {
    id: "account",
    label: "Settings",
    href: "/account",
    icon: <Settings size={18} />,
  },
  {
    id: "help",
    label: "Help",
    href: "/help",
    icon: <CircleHelp size={18} />,
  },
];

function NavLink({ item, active }: { item: SidebarNavItem; active: boolean }) {
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-3 rounded-[12px] px-3 py-2 text-[13px] font-medium no-underline transition-colors",
        active
          ? "bg-accent-muted text-selected-fg"
          : "text-text-secondary hover:bg-bg-muted hover:text-text-primary",
      )}
    >
      <span className="shrink-0 opacity-90">{item.icon}</span>
      {item.label}
    </a>
  );
}

export function ProductSidebar({
  activeNavId = "designs",
  scopeName = "Personal",
  scopeDetail = "Private designs",
  userName,
  userHref,
  guest = false,
  createHref = "/create",
  extraNav = [],
}: ProductSidebarProps) {
  return (
    <aside className="flex h-full w-[var(--sidebar-width)] flex-col border-r border-border bg-bg-panel px-4 py-5">
      <div className="flex items-center justify-between px-1 pb-4">
        <a href="/dashboard" className="no-underline">
          <FormaLogo size={26} />
        </a>
        <ThemeToggle compact />
      </div>

      <div className="mb-3 flex items-center gap-2.5 rounded-2xl bg-bg-muted px-2.5 py-2">
        <Avatar name={scopeName} size="sm" shape="tile" />
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[13px] font-semibold text-text-primary">
            {scopeName}
          </strong>
          <span className="block truncate text-[11px] text-text-tertiary">
            {scopeDetail}
          </span>
        </div>
      </div>

      <a href={createHref} className="mb-4 block no-underline">
        <Button variant="primary" fullWidth iconLeft={<Sparkles size={16} />}>
          Create design
        </Button>
      </a>

      <nav className="flex flex-col gap-0.5" aria-label="Product">
        {[...MAIN, ...extraNav].map((item) => (
          <NavLink key={item.id} item={item} active={activeNavId === item.id} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
        {FOOT.map((item) => (
          <NavLink key={item.id} item={item} active={activeNavId === item.id} />
        ))}
        {guest && (
          <a
            href="/signup?next=/dashboard"
            className="mt-1 rounded-[12px] px-3 py-2 text-[13px] font-medium text-accent no-underline hover:bg-accent-muted"
          >
            Create an account
          </a>
        )}
        <a
          href={userHref || (guest ? "/login?next=/dashboard" : "/account")}
          className="mt-2 flex items-center gap-2.5 rounded-2xl px-2 py-2 no-underline hover:bg-bg-muted"
        >
          <Avatar name={userName || "Guest"} size="sm" />
          <span className="truncate text-[13px] font-medium text-text-secondary">
            {userName || "Sign in"}
          </span>
        </a>
      </div>
    </aside>
  );
}
