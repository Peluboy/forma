import { useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import type {
  WorkspaceMemberRole,
  WorkspaceRecord,
} from "../../domain/workspace/types";
import { Button } from "../../shared/components/ui/Button";

interface WorkspaceMembersTabProps {
  workspace: WorkspaceRecord;
  onInviteMember: (email: string, role: WorkspaceMemberRole) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  userRole?: string;
  currentUserId?: string;
}

export function WorkspaceMembersTab({
  workspace,
  onInviteMember,
  onRemoveMember,
  userRole = "owner",
  currentUserId,
}: WorkspaceMembersTabProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceMemberRole>("designer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = userRole === "owner" || userRole === "admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await onInviteMember(email.trim(), role);
      setSuccess(`Invited ${email.trim()} as ${role}.`);
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Failed to invite member.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite Member Section */}
      {canManage && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-lg border border-border bg-bg-panel space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <UserPlus size={16} /> Invite Team Member
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@agency.com"
              className="flex-1 px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent"
              required
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as WorkspaceMemberRole)}
              className="px-3 py-2 text-xs rounded-md border border-border bg-bg-elevated text-text-primary focus:outline-hidden focus:border-accent"
            >
              <option value="admin">Admin</option>
              <option value="designer">Designer</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" size="sm" disabled={busy || !email.trim()}>
              {busy ? "Inviting..." : "Send Invite"}
            </Button>
          </div>
          {error && <p className="text-xs text-rose-500">{error}</p>}
          {success && <p className="text-xs text-emerald-500">{success}</p>}
        </form>
      )}

      {/* Members List */}
      <div className="border border-border rounded-lg bg-bg-panel overflow-hidden divide-y divide-border">
        {workspace.members.map((member) => (
          <div
            key={member.userId}
            className="p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center font-semibold text-xs">
                {(member.name || member.email || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-text-primary">
                    {member.name ||
                      member.email?.split("@")[0] ||
                      member.userId}
                  </span>
                  {member.userId === currentUserId && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-bg-elevated text-text-secondary">
                      You
                    </span>
                  )}
                  {member.status === "invited" && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Invited
                    </span>
                  )}
                </div>
                {member.email && (
                  <p className="text-xs text-text-secondary">{member.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2 py-0.5 rounded capitalize bg-bg-elevated text-text-secondary border border-border">
                {member.role}
              </span>

              {canManage &&
                member.role !== "owner" &&
                member.userId !== currentUserId && (
                  <button
                    onClick={() => onRemoveMember(member.userId)}
                    className="p-1.5 text-text-tertiary hover:text-rose-500 transition-colors rounded hover:bg-rose-500/10"
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
