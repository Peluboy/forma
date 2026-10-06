import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CreditCard,
  Download,
  LockKeyhole,
  LogOut,
  Palette,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  api,
  authChanged,
  getSupabase,
  signOut,
  useAccount,
  type Config,
  type User,
} from "../../shared/api/api";
import Billing from "../billing/Billing";
import { downloadJson, type Preferences } from "../../shared/navigation";
import { PageMeta, SiteShell } from "../site/PublicSite";
import { ThemeToggle } from "../../shared/components/ThemeToggle";

const tabs = [
  { id: "profile", label: "Profile", Icon: UserRound },
  { id: "security", label: "Security", Icon: LockKeyhole },
  { id: "appearance", label: "Appearance", Icon: Palette },
  { id: "billing", label: "Plans & billing", Icon: CreditCard },
  { id: "data", label: "Data & privacy", Icon: ShieldCheck },
] as const;
type Tab = (typeof tabs)[number]["id"];
export default function AccountSettings() {
  const account = useAccount();
  const deleted = useRef(false);
  useEffect(() => {
    if (
      !deleted.current &&
      account.ready &&
      !account.error &&
      !account.session.user
    )
      location.replace(
        `/login?next=${encodeURIComponent(location.pathname + location.search)}`,
      );
  }, [account.ready, account.error, account.session.user?.id]);
  return (
    <SiteShell compact>
      <PageMeta title="Your account" privatePage />
      <main id="main" className="settings-page">
        {account.error ? (
          <div className="form-error" role="alert">
            {account.error}
            <button
              className="button secondary"
              onClick={() => location.reload()}
            >
              Try again
            </button>
          </div>
        ) : !account.ready || !account.session.user ? (
          <p role="status">Opening your account…</p>
        ) : (
          <SettingsContent
            onDeleted={() => {
              deleted.current = true;
            }}
            key={account.session.user.id}
            user={account.session.user}
            config={account.config}
            canDelete={!!account.session.capabilities?.accountDeletion}
          />
        )}
      </main>
    </SiteShell>
  );
}
function SettingsContent({
  user,
  config,
  canDelete,
  onDeleted,
}: {
  user: User;
  config: Config;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const initialTab = new URLSearchParams(location.search).get("tab");
  const [tab, setTab] = useState<Tab>(
    tabs.find((t) => t.id === initialTab)?.id || "profile",
  );
  const [name, setName] = useState(user.name);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [deleteText, setDeleteText] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [prefsError, setPrefsError] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let alive = true;
    void api<Preferences>("/account/preferences")
      .then((p) => alive && setPreferences(p))
      .catch((e) => alive && setPrefsError(e.message));
    return () => {
      alive = false;
    };
  }, [user.id]);
  useEffect(() => {
    setName(user.name);
  }, [user.name]);
  async function run(label: string, task: () => Promise<string | void>) {
    setBusy(label);
    setError("");
    setMessage("");
    try {
      const result = await task();
      if (result) setMessage(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function reauthenticate(current: string) {
    const sb = await getSupabase();
    if (!sb) return null;
    const { data, error } = await sb.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (error)
      throw new Error(
        "Your current password could not be verified. Please try again.",
      );
    if (data.user.id !== user.id)
      throw new Error("Your account changed. Reload before continuing.");
    return sb;
  }
  function choose(next: Tab) {
    setTab(next);
    setError("");
    setMessage("");
    setCurrentPassword("");
    setPassword("");
    setConfirmation("");
    setEmailPassword("");
    const p = new URLSearchParams(location.search);
    p.set("tab", next);
    history.replaceState({}, "", `/account?${p}`);
  }
  return (
    <>
      <a className="site-text-link settings-back" href="/dashboard">
        <ArrowLeft size={16} />
        Back to your workspace
      </a>
      <div className="settings-heading">
        <div>
          <span className="site-eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>Your account.</h1>
          <p>A little more you. Everything in one place.</p>
        </div>
        <div className="settings-avatar" aria-hidden="true">
          {user.name[0]?.toUpperCase()}
        </div>
      </div>
      <div className="settings-layout">
        <aside className="settings-nav">
          <nav aria-label="Account sections">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                className={tab === id ? "selected" : ""}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => choose(id)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>
          <div className="settings-identity">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button
            className="settings-signout"
            disabled={!!busy}
            onClick={() =>
              void run("signout", async () => {
                await signOut();
                location.assign("/login");
              })
            }
          >
            <LogOut size={17} />
            Sign out
          </button>
        </aside>
        <section
          className="settings-content"
          aria-label={tabs.find((t) => t.id === tab)!.label}
        >
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="success-message settings-message" role="status">
              {message}
            </p>
          )}
          {tab === "profile" && (
            <>
              <section className="settings-card">
                <div className="settings-card-title">
                  <UserRound size={21} />
                  <div>
                    <h2>The basics</h2>
                    <p>The name you’ll see around your workspace.</p>
                  </div>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run("profile", async () => {
                      const sb = await getSupabase();
                      if (sb) {
                        const { error } = await sb.auth.updateUser({
                          data: { name: name.trim() },
                        });
                        if (error) throw error;
                      } else
                        await api("/account/profile", {
                          method: "PUT",
                          body: JSON.stringify({ name }),
                        });
                      authChanged();
                      return "Your profile has been updated.";
                    });
                  }}
                >
                  <label className="form-label">
                    Display name
                    <input
                      value={name}
                      required
                      minLength={1}
                      maxLength={80}
                      autoComplete="name"
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="form-label">
                    Account email
                    <input value={user.email} readOnly type="email" />
                  </label>
                  <p className="quiet-note">
                    To change your email, visit Security.
                  </p>
                  <button
                    className="button primary"
                    disabled={
                      !!busy || !name.trim() || name.trim() === user.name
                    }
                  >
                    {busy === "profile" ? "Saving…" : "Save profile"}
                  </button>
                </form>
              </section>
              <section className="settings-card">
                <div className="settings-card-title">
                  <Palette size={21} />
                  <div>
                    <h2>Your creative starting point</h2>
                    <p>A small preference for how you use Forma.</p>
                  </div>
                </div>
                {prefsError && (
                  <p className="form-error" role="alert">
                    {prefsError}
                    <button
                      className="text-button"
                      onClick={() => {
                        setPrefsError("");
                        void api<Preferences>("/account/preferences")
                          .then(setPreferences)
                          .catch((e) => setPrefsError(e.message));
                      }}
                    >
                      Retry
                    </button>
                  </p>
                )}
                {preferences ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run("preferences", async () => {
                        await api("/account/preferences", {
                          method: "PUT",
                          body: JSON.stringify(preferences),
                        });
                        return "Workspace preference saved.";
                      });
                    }}
                  >
                    <label className="form-label">
                      I use Forma for
                      <select
                        value={preferences.purpose}
                        onChange={(e) =>
                          setPreferences({
                            ...preferences,
                            purpose: e.target.value as Preferences["purpose"],
                          })
                        }
                      >
                        <option value="personal">My own projects</option>
                        <option value="business">My business or brand</option>
                        <option value="client">Work for my clients</option>
                      </select>
                    </label>
                    <div className="settings-actions">
                      <button className="button secondary" disabled={!!busy}>
                        Save preference
                      </button>
                      <a className="site-text-link" href="/onboarding">
                        Take the quick start again
                      </a>
                    </div>
                  </form>
                ) : (
                  !prefsError && <p role="status">Loading preferences…</p>
                )}
              </section>
            </>
          )}
          {tab === "security" && (
            <>
              <section className="settings-card">
                <h2>Change password</h2>
                <p>Use a unique password of at least 12 characters.</p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run("password", async () => {
                      if (password !== confirmation)
                        throw new Error("Your new passwords do not match.");
                      const sb = await reauthenticate(currentPassword);
                      if (sb) {
                        const { error } = await sb.auth.updateUser({
                          password,
                        });
                        if (error) throw error;
                        const revoked = await sb.auth.signOut({
                          scope: "others",
                        });
                        if (revoked.error) {
                          setCurrentPassword("");
                          setPassword("");
                          setConfirmation("");
                          return "Password updated. Other sessions could not be signed out; use the session control below.";
                        }
                      } else
                        await api("/account/password", {
                          method: "PUT",
                          body: JSON.stringify({ currentPassword, password }),
                        });
                      setCurrentPassword("");
                      setPassword("");
                      setConfirmation("");
                      authChanged();
                      return "Password updated. Other sessions have been signed out.";
                    });
                  }}
                >
                  <label className="form-label">
                    Current password
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      maxLength={128}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </label>
                  <div className="settings-input-row">
                    <label className="form-label">
                      New password
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </label>
                    <label className="form-label">
                      Confirm new password
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={12}
                        maxLength={128}
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                      />
                    </label>
                  </div>
                  <button className="button primary" disabled={!!busy}>
                    {busy === "password" ? "Updating…" : "Update password"}
                  </button>
                </form>
              </section>
              <section className="settings-card">
                <h2>Email address</h2>
                <p>
                  Your current email is <strong>{user.email}</strong>.
                </p>
                {config.mode === "local" ? (
                  <div className="settings-note">
                    Email changes require verification. They’re available on the
                    hosted app once email delivery is connected.
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run("email", async () => {
                        const sb = await reauthenticate(emailPassword);
                        const { error } = await sb!.auth.updateUser(
                          { email: newEmail },
                          {
                            emailRedirectTo: `${location.origin}/auth/callback?next=/account%3Ftab%3Dsecurity`,
                          },
                        );
                        if (error) throw error;
                        setEmailPassword("");
                        authChanged();
                        return "Check your current and new inboxes for the confirmation steps. Your account email stays unchanged until verification completes.";
                      });
                    }}
                  >
                    <label className="form-label">
                      New email address
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                      />
                    </label>
                    <label className="form-label">
                      Password to confirm email change
                      <input
                        required
                        type="password"
                        autoComplete="current-password"
                        maxLength={128}
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                      />
                    </label>
                    <button
                      className="button secondary"
                      disabled={!!busy || newEmail === user.email}
                    >
                      Send verification
                    </button>
                  </form>
                )}
              </section>
              <section className="settings-card">
                <h2>Signed-in sessions</h2>
                <p>
                  Keep this browser signed in and end other sessions. On other
                  devices, the change may take a short time to appear.
                </p>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void run("sessions", async () => {
                      await signOut("others");
                      return "Other sessions have been signed out. This browser stays signed in.";
                    })
                  }
                >
                  Sign out other sessions
                </button>
              </section>
            </>
          )}
          {tab === "appearance" && (
            <section className="settings-card">
              <h2>Interface theme</h2>
              <p>
                Changes the Forma workspace chrome only. Your designs, reference
                images, and exports stay the same.
              </p>
              <ThemeToggle />
            </section>
          )}
          {tab === "billing" && (
            <Billing
              user={user}
              onSignIn={() =>
                location.assign("/login?next=/account%3Ftab%3Dbilling")
              }
              beforeCheckout={async () => {}}
            />
          )}
          {tab === "data" && (
            <>
              <section className="settings-card">
                <div className="settings-card-title">
                  <Download size={22} />
                  <div>
                    <h2>Your work, to keep</h2>
                    <p>
                      Download your profile, projects, revisions, review data,
                      preferences, and recent billing summary as JSON.
                    </p>
                  </div>
                </div>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void run("export", async () => {
                      const data = await api("/account/export");
                      downloadJson(data, "forma-workspace-data.json");
                      return "Your workspace data download is ready.";
                    })
                  }
                >
                  <Download size={16} />
                  {busy === "export"
                    ? "Preparing download…"
                    : "Download workspace data"}
                </button>
              </section>
              <section className="settings-card danger-card">
                <div className="settings-card-title">
                  <Trash2 size={21} />
                  <div>
                    <h2>Delete account</h2>
                    <p>
                      This permanently deletes your account, saved projects,
                      revisions, and review links. Cancel any subscription
                      renewal first.
                    </p>
                  </div>
                </div>
                {!canDelete ? (
                  <p className="settings-note">
                    Account deletion is currently unavailable. Please contact
                    your beta administrator.
                  </p>
                ) : !deleteOpen ? (
                  <button
                    className="danger-link"
                    onClick={() => setDeleteOpen(true)}
                  >
                    Delete my account
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void run("delete", async () => {
                        if (deleteText !== "DELETE")
                          throw new Error("Type DELETE to confirm.");
                        await api("/account", { method: "DELETE" });
                        onDeleted();
                        const sb = await getSupabase();
                        await sb?.auth.signOut({ scope: "local" });
                        authChanged();
                        location.assign("/?account=deleted");
                      });
                    }}
                  >
                    <label className="form-label">
                      Type DELETE to confirm
                      <input
                        autoComplete="off"
                        required
                        value={deleteText}
                        onChange={(e) => setDeleteText(e.target.value)}
                      />
                    </label>
                    <div className="settings-actions">
                      <button
                        className="button danger"
                        disabled={!!busy || deleteText !== "DELETE"}
                      >
                        Permanently delete account
                      </button>
                      <button
                        type="button"
                        className="button secondary"
                        disabled={!!busy}
                        onClick={() => {
                          setDeleteOpen(false);
                          setDeleteText("");
                        }}
                      >
                        Keep my account
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </>
  );
}
