import { useState } from "react";
import {
  ArrowRight,
  Copy,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  api,
  authChanged,
  getSupabase,
  post,
  signOut,
  type Config,
  type User,
} from "../../shared/api/api";
export type AuthMode = "login" | "register" | "recover" | "password";
export default function Account({
  user,
  config,
  onClose,
  onMessage,
  onBilling,
  initialMode,
  onModeChange,
  onComplete,
  onSettings,
  nextAfterAuth,
}: {
  user: User | null;
  config: Config;
  onClose: () => void;
  onMessage: (s: string) => void;
  onBilling: () => void;
  initialMode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onComplete?: (mode: AuthMode) => void;
  onSettings?: () => void;
  nextAfterAuth?: string;
}) {
  const [mode, setMode] = useState<AuthMode>(
    initialMode ||
      (window.location.hash.includes("type=recovery") ||
      window.location.search.includes("reset=1")
        ? "password"
        : "login"),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  function changeMode(next: AuthMode) {
    setMode(next);
    setError("");
    setMessage("");
    setAwaitingConfirmation(false);
    onModeChange?.(next);
  }
  function complete() {
    if (onComplete) onComplete(mode);
    else onClose();
  }
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovery, setRecovery] = useState("");
  const [backup, setBackup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const sb = await getSupabase();
      if (sb) {
        if (mode === "register") {
          const result = await sb.auth.signUp({
            email,
            password,
            options: {
              data: { name },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextAfterAuth || "/onboarding")}`,
            },
          });
          if (result.error) throw result.error;
          if (!result.data.session) {
            setAwaitingConfirmation(true);
            setMessage(
              "Check your email to confirm your account. Private beta accounts may need an invitation.",
            );
            return;
          }
        } else if (mode === "login") {
          const { error } = await sb.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
        } else if (mode === "recover") {
          const { error } = await sb.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (error) throw error;
          setMessage(
            "If this account exists, a password-reset email is on its way.",
          );
          return;
        } else {
          const { error } = await sb.auth.updateUser({ password });
          if (error) throw error;
          window.history.replaceState({}, "", window.location.pathname);
          setMessage("Password updated. You can continue to your workspace.");
          authChanged();
          return;
        }
      } else if (mode === "register") {
        const data = await post<{ recoveryCode: string }>("/auth/register", {
          name,
          email,
          password,
        });
        setBackup(data.recoveryCode);
        authChanged();
        return;
      } else if (mode === "recover") {
        const data = await post<{ recoveryCode: string }>("/auth/recover", {
          email,
          recoveryCode: recovery,
          password,
        });
        setBackup(data.recoveryCode);
        setMessage(
          "Password reset. Save the replacement recovery code, then sign in.",
        );
        return;
      } else await post("/auth/login", { email, password });
      authChanged();
      onMessage("Welcome back. Your workspace is ready.");
      complete();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not complete this request.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (backup)
    return (
      <div className="auth-form">
        <div className="auth-emblem">
          <ShieldCheck size={28} />
        </div>
        <h3>Save your recovery code.</h3>
        <p>
          This local account has no email delivery. This code is the only way to
          recover a forgotten password. It is shown once.
        </p>
        <code className="recovery-code">{backup}</code>
        <button
          className="button secondary full-width"
          onClick={() => {
            void navigator.clipboard.writeText(backup).then(
              () => setMessage("Recovery code copied."),
              () => setError("Copy the code manually."),
            );
          }}
        >
          <Copy size={15} />
          Copy recovery code
        </button>
        {message && <p className="success-message">{message}</p>}
        <button className="button primary full-width" onClick={complete}>
          I have saved my code
        </button>
      </div>
    );
  if (user && mode !== "password")
    return (
      <div className="auth-form">
        <div className="account-card">
          <div className="account-big-avatar">
            {user.name?.[0]?.toUpperCase() || "Y"}
          </div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
          <span className="small-pill">
            {config.mode === "supabase"
              ? "Private beta · Supabase"
              : "Local development account"}
          </span>
        </div>
        <p className="quiet-note">
          Your signed-in projects are stored on{" "}
          {config.mode === "supabase"
            ? "your configured Supabase service"
            : "this development server"}
          . Guest projects stay in this browser.
        </p>
        <button className="button primary full-width" onClick={onBilling}>
          Plans and billing
        </button>
        {onSettings ? (
          <button className="button secondary full-width" onClick={onSettings}>
            Account settings
          </button>
        ) : (
          <a className="button secondary full-width" href="/account">
            Account settings
          </a>
        )}
        {onComplete && (
          <button className="button secondary full-width" onClick={complete}>
            Continue to workspace
          </button>
        )}
        <button
          className="button secondary full-width"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
              onClose();
              onMessage("Signed out. Your account projects remain saved.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogOut size={16} />
          Sign out
        </button>
        <button
          className="danger-link"
          onClick={() => setConfirmDelete(!confirmDelete)}
        >
          Delete my account and saved data
        </button>
        {confirmDelete && (
          <div className="inline-warning">
            <div>
              This permanently removes your account, projects, and review links.
              <button
                className="button danger full-width"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api("/account", { method: "DELETE" });
                    const sb = await getSupabase();
                    await sb?.auth.signOut({ scope: "local" });
                    authChanged();
                    onClose();
                    onMessage("Account and saved data deleted.");
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Permanently delete account
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-emblem">
        <LockKeyhole size={25} />
      </div>
      <h3>
        {mode === "register"
          ? "A home for your good ideas."
          : mode === "recover"
            ? "Let’s get you back in."
            : mode === "password"
              ? "Choose a new password."
              : "Welcome to your workspace."}
      </h3>
      <p>
        {config.mode === "offline"
          ? "The account server is unavailable. You can still use the editor as a guest."
          : mode === "register"
            ? "Save your designs, return to past revisions, and invite feedback."
            : "Your designs and exact words, right where you left them."}
      </p>
      {mode === "register" && (
        <label className="form-label">
          Your name
          <input
            autoComplete="name"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      )}
      {mode !== "password" && (
        <label className="form-label">
          Email address
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
      )}
      {(mode !== "recover" || config.mode === "local") && (
        <label className="form-label">
          {mode === "recover" || mode === "password"
            ? "New password"
            : "Password"}
          <input
            type={showPassword ? "text" : "password"}
            aria-label={
              mode === "recover" || mode === "password"
                ? "New password"
                : "Password"
            }
            minLength={12}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="password-visibility"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPassword ? "Hide" : "Show"}
          </button>
          <small>At least 12 characters.</small>
        </label>
      )}
      {mode === "recover" && config.mode === "local" && (
        <label className="form-label">
          Recovery code
          <input
            required
            value={recovery}
            onChange={(e) => setRecovery(e.target.value)}
            autoComplete="off"
          />
        </label>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      {awaitingConfirmation && (
        <button
          type="button"
          className="button secondary full-width"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const sb = await getSupabase();
              const result = await sb!.auth.resend({
                type: "signup",
                email,
                options: {
                  emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextAfterAuth || "/onboarding")}`,
                },
              });
              if (result.error) throw result.error;
              setMessage(
                "If confirmation is needed, another email is on its way. Check your spam folder too.",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Mail size={16} />
          Resend confirmation email
        </button>
      )}
      <button
        className="button primary full-width"
        disabled={busy || config.mode === "offline" || awaitingConfirmation}
      >
        {busy
          ? "One moment…"
          : mode === "register"
            ? "Create account"
            : mode === "recover"
              ? "Reset password"
              : mode === "password"
                ? "Update password"
                : "Sign in"}
        <ArrowRight size={16} />
      </button>
      {mode === "password" && message && (
        <button
          type="button"
          className="button secondary full-width"
          onClick={complete}
        >
          Continue to workspace
        </button>
      )}
      <div className="auth-links">
        <button
          type="button"
          onClick={() => {
            changeMode(mode === "register" ? "login" : "register");
          }}
        >
          {mode === "register"
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </button>
        {mode === "login" && (
          <button type="button" onClick={() => changeMode("recover")}>
            Forgot password?
          </button>
        )}
        {(mode === "recover" || mode === "password") && (
          <button type="button" onClick={() => changeMode("login")}>
            Back to sign in
          </button>
        )}
      </div>
      <div className="copy-assurance">
        <ShieldCheck size={14} />
        {config.mode === "local"
          ? "Local development · no emails sent"
          : "Private beta · no payment required"}
      </div>
    </form>
  );
}
