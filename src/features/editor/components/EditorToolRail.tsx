import {
  CircleHelp,
  FileInput,
  FileText,
  FolderOpen,
  ImagePlus,
  LayoutGrid,
  MoreHorizontal,
  Presentation,
  ScanLine,
  Sparkles,
  Type,
  Users,
} from "lucide-react";
import type { EditorNav } from "../lib/editorNav";

const designTools = [
  { id: "templates", label: "Design", icon: LayoutGrid },
  { id: "elements", label: "Elements", icon: ImagePlus },
  { id: "text", label: "Text", icon: Type },
  { id: "reference", label: "Reference", icon: ScanLine },
] as const;

const formatTools = [
  { id: "document", label: "Document", icon: FileText },
  { id: "presentation", label: "Slides", icon: Presentation },
] as const;

const moreTools = [
  { id: "skills", label: "Workflows", icon: Sparkles },
  { id: "team", label: "Team", icon: Users },
  { id: "projects", label: "Projects", icon: FolderOpen },
] as const;

export function EditorToolRail({
  nav,
  showLibrary,
  contentOpen,
  moreOpen,
  avatar,
  onOpenTool,
  onOpenContent,
  onToggleMore,
  onHelp,
  onAccount,
}: {
  nav: EditorNav;
  showLibrary: boolean;
  contentOpen: boolean;
  moreOpen: boolean;
  avatar: string;
  onOpenTool: (tool: EditorNav, toggle?: boolean) => void;
  onOpenContent: () => void;
  onToggleMore: () => void;
  onHelp: () => void;
  onAccount: () => void;
}) {
  const moreSelected =
    moreOpen || (showLibrary && moreTools.some((tool) => tool.id === nav));
  return (
    <nav className="tool-rail" aria-label="Design tools">
      <div className="rail-top">
        {designTools.map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            aria-pressed={nav === tool.id && showLibrary}
            className={`rail-item ${nav === tool.id && showLibrary ? "selected" : ""}`}
            onClick={() => onOpenTool(tool.id, true)}
          >
            <tool.icon size={21} strokeWidth={1.8} />
            <span>{tool.label}</span>
          </button>
        ))}
        <div className="rail-divider" aria-hidden="true" />
        <button
          title="Content"
          aria-pressed={contentOpen}
          className={`rail-item ${contentOpen ? "selected" : ""}`}
          onClick={onOpenContent}
        >
          <FileInput size={21} strokeWidth={1.8} />
          <span>Content</span>
        </button>
        <div className="rail-divider" aria-hidden="true" />
        {formatTools.map((tool) => (
          <button
            key={tool.id}
            title={tool.label}
            aria-pressed={nav === tool.id && showLibrary}
            className={`rail-item ${nav === tool.id && showLibrary ? "selected" : ""}`}
            onClick={() => onOpenTool(tool.id, true)}
          >
            <tool.icon size={21} strokeWidth={1.8} />
            <span>{tool.label}</span>
          </button>
        ))}
        <div className="file-menu-wrap">
          <button
            aria-pressed={moreSelected}
            className={`rail-item ${moreSelected ? "selected" : ""}`}
            onClick={onToggleMore}
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span>More</span>
          </button>
          {moreOpen && (
            <div className="dropdown rail-more-menu">
              {moreTools.map((tool) => (
                <button key={tool.id} onClick={() => onOpenTool(tool.id)}>
                  <tool.icon size={16} strokeWidth={1.75} />
                  {tool.label}
                </button>
              ))}
              <button onClick={onHelp}>
                <CircleHelp size={16} strokeWidth={1.75} />
                Help
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="rail-bottom">
        <button
          className="rail-avatar"
          aria-label="Open account"
          onClick={onAccount}
        >
          {avatar}
        </button>
      </div>
    </nav>
  );
}
