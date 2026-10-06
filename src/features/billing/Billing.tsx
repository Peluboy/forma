import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, post, type User } from "../../shared/api/api";

type Plans = {
  enabled: boolean;
  testMode: boolean;
  freeLimit: number;
  proLimit: number;
  price: null | { amount: number; currency: string; interval: string };
};
type Status = {
  plan: string;
  paidUntil: string | null;
  subscriptionStatus: string;
  canManage: boolean;
  pendingReference: string | null;
  usage: number;
  limit: number | null;
  payments: {
    reference: string;
    amount: number;
    currency: string;
    paidAt: string;
    revoked?: boolean;
  }[];
};
const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    amount / 100,
  );
export default function Billing({
  user,
  onSignIn,
  beforeCheckout,
}: {
  user: User | null;
  onSignIn: () => void;
  beforeCheckout: () => Promise<unknown>;
}) {
  const [plans, setPlans] = useState<Plans | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    const [p, s] = await Promise.all([
      api<Plans>("/billing/plans"),
      user ? api<Status>("/billing") : Promise.resolve(null),
    ]);
    setPlans(p);
    setStatus(s);
  }
  useEffect(() => {
    let alive = true;
    Promise.all([
      api<Plans>("/billing/plans"),
      user ? api<Status>("/billing") : Promise.resolve(null),
    ])
      .then(([p, s]) => {
        if (alive) {
          setPlans(p);
          setStatus(s);
        }
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [user?.id]);
  async function action(kind: "checkout" | "manage" | "refresh") {
    if (!user) {
      onSignIn();
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (kind === "checkout") await beforeCheckout();
      const params = new URLSearchParams(window.location.search);
      const reference =
        params.get("reference") ||
        params.get("trxref") ||
        status?.pendingReference;
      if (kind === "refresh" && reference) {
        setStatus(await post<Status>("/billing/verify", { reference }));
        params.delete("reference");
        params.delete("trxref");
        params.delete("billing");
        window.history.replaceState(
          {},
          "",
          `${window.location.pathname}${params.size ? `?${params}` : ""}`,
        );
      } else {
        const result = await post<Status & { url?: string }>(
          `/billing/${kind}`,
          {},
        );
        if (result.url) {
          window.location.assign(result.url);
          return;
        }
        setStatus(result);
      }
      setMessage("Billing status refreshed from Paystack.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Billing could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }
  const returning =
    new URLSearchParams(window.location.search).get("billing") === "return";
  return (
    <div className="billing-panel">
      <p className="billing-intro">
        A plan for your next good idea. Keep your words, your designs, and
        control of your subscription.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}{" "}
          <button
            className="text-link"
            onClick={() => {
              setError("");
              void load().catch((e) => setError(e.message));
            }}
          >
            Retry
          </button>
        </p>
      )}
      {!plans && !error && <p role="status">Loading plans…</p>}
      {plans && (
        <>
          {!plans.enabled && (
            <div className="billing-notice">
              Free beta is open. Pro pricing has not been published; checkout is
              unavailable until it is configured.
            </div>
          )}
          {plans.enabled && plans.testMode && (
            <div className="billing-notice">
              Test checkout · use Paystack test payment details. No live
              subscription is sold here.
            </div>
          )}
          {returning && (
            <div className="billing-notice">
              Welcome back. Select “Refresh billing” to verify your payment
              securely. This page alone does not confirm payment.
            </div>
          )}
          <div className="billing-plans">
            <section className="billing-plan">
              <span className="small-pill">START CREATING</span>
              <h3>Free</h3>
              <div className="billing-price">Free</div>
              <p>Make your first design feel right.</p>
              <ul>
                <li>
                  <Check size={15} /> Editor, templates, and exact-copy checks
                </li>
                <li>
                  <Check size={15} /> Saved projects and design exports
                </li>
                <li>
                  <Check size={15} /> {plans.freeLimit} analyses per calendar
                  month when billing launches
                </li>
              </ul>
              <button
                className="button secondary full-width"
                disabled={!!user}
                onClick={onSignIn}
              >
                {user
                  ? status?.plan === "pro"
                    ? "Included with Pro"
                    : "Your current plan"
                  : "Create a free account"}
              </button>
            </section>
            <section className="billing-plan pro">
              <span className="small-pill">MORE ROOM TO CREATE</span>
              <h3>Pro</h3>
              <div className="billing-price">
                {plans.price
                  ? money(plans.price.amount, plans.price.currency)
                  : "Coming soon"}
                {plans.price && (
                  <small>
                    /{plans.price.interval === "annually" ? "year" : "month"}
                  </small>
                )}
              </div>
              <p>For a regular flow of reference designs.</p>
              <ul>
                <li>
                  <Check size={15} /> Everything in Free
                </li>
                <li>
                  <Check size={15} /> {plans.proLimit} analyses per calendar
                  month
                </li>
                <li>
                  <Check size={15} /> Manage renewal and payment card online
                </li>
              </ul>
              <button
                className="button primary full-width"
                disabled={
                  busy ||
                  !plans.enabled ||
                  status?.plan === "pro" ||
                  (!!status?.canManage &&
                    !["cancelled", "completed", "complete"].includes(
                      status.subscriptionStatus,
                    ))
                }
                onClick={() => void action("checkout")}
              >
                {status?.plan === "pro"
                  ? "Your current plan"
                  : status?.pendingReference
                    ? "Resume checkout"
                    : "Upgrade to Pro"}
                <ArrowUpRight size={16} />
              </button>
            </section>
          </div>
          {plans.price && (
            <p className="quiet-note">
              Pro renews automatically{" "}
              {plans.price.interval === "annually" ? "each year" : "each month"}{" "}
              at {money(plans.price.amount, plans.price.currency)}. Cancel
              renewal through Manage subscription. Monthly allowances reset on
              the first day of each month (UTC); unused analyses do not roll
              over. Started analysis attempts count toward the allowance,
              including provider failures.
            </p>
          )}
          {status && (
            <section className="billing-summary">
              <div>
                <CreditCard size={20} />
                <h3>Your billing</h3>
                <span className="small-pill">
                  {status.plan === "pro" ? "Pro" : "Free"}
                </span>
              </div>
              <p>
                {status.limit === null
                  ? "Beta allowances apply while subscriptions are closed."
                  : `${status.usage} of ${status.limit} analyses used this month.`}
              </p>
              {status.paidUntil && (
                <p>
                  Paid access through{" "}
                  {new Date(status.paidUntil).toLocaleDateString()}. Renewal
                  status:{" "}
                  {status.subscriptionStatus === "none"
                    ? "syncing"
                    : status.subscriptionStatus}
                  .
                </p>
              )}
              {status.subscriptionStatus === "attention" && (
                <p className="form-error">
                  Your last renewal needs attention. Update your card in
                  Paystack; access returns to Free when the paid period ends.
                </p>
              )}
              <div className="billing-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => void action("refresh")}
                >
                  <RefreshCw size={15} />
                  Refresh billing
                </button>
                {status.canManage && (
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void action("manage")}
                  >
                    Manage subscription
                    <ArrowUpRight size={15} />
                  </button>
                )}
              </div>
              {status.payments.length > 0 && (
                <>
                  <h4>Payment history</h4>
                  <div className="billing-history">
                    {status.payments.map((p) => (
                      <div key={p.reference}>
                        <span>
                          {new Date(p.paidAt).toLocaleDateString()}
                          <small>{p.reference}</small>
                        </span>
                        <strong>
                          {money(p.amount, p.currency)}
                          {p.revoked && (
                            <small>Access reversed · contact support</small>
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
          {message && (
            <p className="success-message" role="status">
              {message}
            </p>
          )}
          <p className="copy-assurance">
            <ShieldCheck size={15} /> Payments are handled by Paystack. Forma
            never stores your card details.
          </p>
        </>
      )}
    </div>
  );
}
