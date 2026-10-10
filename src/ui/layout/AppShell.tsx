import { useState, type ReactNode } from "react";
import { ProductSidebar, type SidebarNavItem } from "./ProductSidebar";
import { Topbar } from "./Topbar";
import { cx } from "../lib/cx";

export interface NavItem extends SidebarNavItem {}

export interface AppShellProps {
  activeNavId?: string;
  currentScope?: {
    type: "personal" | "workspace" | "client";
    name: string;
    subName?: string;
  };
  trail?: ReactNode;
  userName?: string;
  userHref?: string;
  guest?: boolean;
  topbarActions?: ReactNode;
  contentWidth?: "default" | "wide" | "full";
  extraNav?: SidebarNavItem[];
  children: ReactNode;
}

export function AppShell({
  activeNavId = "designs",
  currentScope,
  trail,
  userName,
  userHref,
  guest = false,
  topbarActions,
  contentWidth = "default",
  extraNav,
  children,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const max =
    contentWidth === "full"
      ? "max-w-none"
      : contentWidth === "wide"
        ? "max-w-[1360px]"
        : "max-w-[1120px]";

  return (
    <div className="flex min-h-dvh bg-bg-page font-[var(--font-ui)] text-text-primary antialiased">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only fixed top-3 left-3 z-50 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-text-on-accent shadow-lg"
      >
        Skip to content
      </a>

      <div className="hidden md:block">
        <div className="sticky top-0 h-dvh">
          <ProductSidebar
            activeNavId={activeNavId}
            scopeName={currentScope?.name || "Personal"}
            scopeDetail={currentScope?.subName || "Private designs"}
            userName={userName}
            userHref={userHref}
            guest={guest}
            extraNav={extraNav}
          />
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-[var(--overlay)]"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full w-[min(80vw,280px)]">
            <ProductSidebar
              activeNavId={activeNavId}
              scopeName={currentScope?.name || "Personal"}
              scopeDetail={currentScope?.subName || "Private designs"}
              userName={userName}
              userHref={userHref}
              guest={guest}
              extraNav={extraNav}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          trail={trail}
          actions={topbarActions}
          userName={userName}
          userHref={userHref || (guest ? "/login?next=/dashboard" : "/account")}
          menuOpen={mobileMenuOpen}
          onToggleMenu={() => setMobileMenuOpen((open) => !open)}
        />
        <main
          id="main-content"
          className={cx("mx-auto w-full flex-1 px-4 py-6 md:px-8 md:py-8", max)}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
