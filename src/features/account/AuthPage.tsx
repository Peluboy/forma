import { useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Account, { type AuthMode } from "./Account";
import { api, getSupabase, useAccount } from "../../shared/api/api";
import { safeNext, type Preferences } from "../../shared/navigation";
import { Logo, PageMeta, Preview } from "../site/PublicSite";

const routes: Record<AuthMode, string> = {
  login: "/login",
  register: "/signup",
  recover: "/forgot-password",
  password: "/reset-password",
};
export default function AuthPage({
  mode,
  callback = false,
}: {
  mode: AuthMode;
  callback?: boolean;
}) {
  const { session, config, ready, error } = useAccount();
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const params = new URLSearchParams(location.search);
  const requested = params.get("next");
  const next = safeNext(requested);
  const title = callback
    ? "Confirm your account"
    : {
        login: "Welcome back",
        register: "Make yourself at home",
        recover: "Get back to your workspace",
        password: "Choose a new password",
      }[mode];
  async function finish(completedMode: AuthMode) {
    if (completedMode === "recover") {
      location.assign("/login");
      return;
    }
    try {
      // Refresh the authenticated session before issuing a CSRF-protected request later.
      await api("/session");
      const preferences = await api<Preferences>("/account/preferences");
      location.assign(
        requested ? next : preferences.completed ? "/dashboard" : "/onboarding",
      );
    } catch (e) {
      setFailure((e as Error).message);
    }
  }
  useEffect(() => {
    if (!callback) return;
    let active = true;
    const authError =
      new URLSearchParams(location.hash.slice(1)).get("error") ||
      params.get("error");
    if (authError) {
      setFailure(
        "This confirmation link is expired or invalid. Sign in to resend a confirmation, or request a new password-reset link.",
      );
      return;
    }
    void getSupabase()
      .then(async (sb) => {
        if (!sb) {
          if (active)
            setFailure(
              "Email confirmation is available on the hosted app. You can sign in to this local workspace directly.",
            );
          return;
        }
        const { data, error } = await sb.auth.getSession();
        if (active && (error || !data.session))
          setFailure(
            "This link could not confirm your session. Sign in or request a new confirmation email.",
          );
        else if (active) {
          history.replaceState(
            {},
            "",
            `/auth/callback${requested ? `?next=${encodeURIComponent(next)}` : ""}`,
          );
          setMessage("Your account is confirmed. You’re ready to create.");
        }
      })
      .catch((e) => active && setFailure(e.message));
    return () => {
      active = false;
    };
  }, [callback]);
  return (
    <div className="auth-page">
      <PageMeta title={title} privatePage />
      <aside className="auth-story">
        <Logo />
        <div>
          <span className="site-eyebrow">A PLACE FOR YOUR GOOD IDEAS</span>
          <h1>
            Your words.
            <br />
            Your way.
            <br />
            <em>Your workspace.</em>
          </h1>
          <p>
            Bring the design you love and the words that matter. We’ll help you
            put them together.
          </p>
        </div>
        <div className="auth-art">
          <Preview template="botanical" title={"Room to\ngrow."} />
          <span>
            <ShieldCheck size={17} />
            Your copy stays yours.
          </span>
        </div>
        <a href="/" className="auth-home">
          <ArrowLeft size={15} />
          Back to Forma
        </a>
      </aside>
      <main id="main" className="auth-main">
        <div className="mobile-auth-logo">
          <Logo />
        </div>
        <div className="auth-card">
          <span className="site-eyebrow">
            {callback
              ? "ONE LAST STEP"
              : mode === "register"
                ? "LET’S MAKE SOMETHING GOOD"
                : "YOUR NEXT IDEA IS WAITING"}
          </span>
          {!ready ? (
            <p role="status">Opening your account…</p>
          ) : error ? (
            <div className="form-error" role="alert">
              {error}
              <button
                className="button secondary"
                onClick={() => location.reload()}
              >
                Try again
              </button>
            </div>
          ) : callback ? (
            <>
              <h1>
                {message
                  ? "You’re in good company."
                  : "Let’s confirm your account."}
              </h1>
              {message && <p role="status">{message}</p>}
              {session.user && !failure && (
                <button
                  className="button primary full-width"
                  onClick={() => void finish("login")}
                >
                  Continue to workspace
                </button>
              )}
              <a className="site-text-link" href="/login">
                Back to sign in
              </a>
            </>
          ) : (
            <Account
              initialMode={mode}
              nextAfterAuth={requested ? next : undefined}
              user={session.user}
              config={config}
              onClose={() => location.assign("/")}
              onMessage={setMessage}
              onBilling={() => location.assign("/account?tab=billing")}
              onComplete={(m) => void finish(m)}
              onModeChange={(m) =>
                location.assign(
                  `${routes[m]}${requested ? `?next=${encodeURIComponent(next)}` : ""}`,
                )
              }
            />
          )}
          {failure && (
            <p className="form-error" role="alert">
              {failure}
            </p>
          )}
          <p className="auth-guest">
            Just looking around?{" "}
            <a href="/editor">
              Try the editor without an account
              <ArrowRightIcon />
            </a>
          </p>
          <p className="auth-help">
            Need help? <a href="/help">Visit the help center</a>
          </p>
        </div>
      </main>
    </div>
  );
}
function ArrowRightIcon() {
  return <span aria-hidden="true"> →</span>;
}
