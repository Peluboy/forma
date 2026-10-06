import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { ApiError } from "../store.js";
import type { BillingState, BillingStore, Checkout } from "./store.js";

export function paidUntil(state: BillingState): string | null {
  const dates = Object.values(state.payments)
    .filter((p) => !p.revoked)
    .map((p) => p.until)
    .sort();
  return dates.at(-1) || null;
}
export function periodEnd(paid: string, interval: "monthly" | "annually") {
  const d = new Date(paid);
  if (!Number.isFinite(d.getTime()))
    throw new ApiError(502, "Payment date could not be verified");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  if (interval === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(Math.min(day, 28));
  } else {
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    const last = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
    ).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }
  return d.toISOString();
}
export function validSignature(
  body: Buffer,
  signature: string | undefined,
  secret: string,
) {
  if (!secret || !signature || !/^[a-f0-9]{128}$/i.test(signature))
    return false;
  return timingSafeEqual(
    createHmac("sha512", secret).update(body).digest(),
    Buffer.from(signature, "hex"),
  );
}
const quota = (name: string, fallback: number) => {
  const n = Number(process.env[name] || fallback);
  if (!Number.isSafeInteger(n) || n < 0 || n > 100000)
    throw new Error(`Invalid ${name}`);
  return n;
};
export function createBilling(
  store: BillingStore | null,
  request: typeof fetch = fetch,
) {
  const enabled = process.env.FORMA_BILLING_ENABLED === "true";
  const secret = process.env.PAYSTACK_SECRET_KEY || "";
  const plan = process.env.PAYSTACK_PRO_PLAN_CODE || "";
  const origin = process.env.APP_ORIGIN || "http://127.0.0.1:5173";
  const freeLimit = quota("FORMA_FREE_ANALYSES_PER_MONTH", 5);
  const proLimit = quota("FORMA_PRO_ANALYSES_PER_MONTH", 100);
  if (
    enabled &&
    (!store || !/^sk_(test|live)_/.test(secret) || !/^PLN_/.test(plan))
  )
    throw new Error(
      "Billing requires a Paystack key, Pro plan, and billing storage",
    );
  if (
    enabled &&
    secret.startsWith("sk_live_") &&
    !origin.startsWith("https://")
  )
    throw new Error("Live billing requires an HTTPS APP_ORIGIN");
  async function provider(path: string, body?: unknown): Promise<any> {
    if (!secret) throw new ApiError(503, "Payments are not configured yet");
    try {
      const response = await request(`https://api.paystack.co${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(12000),
      });
      const result = await response.json();
      if (!response.ok || result.status !== true)
        throw new Error("Provider failed");
      return result.data;
    } catch {
      throw new ApiError(
        502,
        "Paystack is temporarily unavailable. Please retry; your plan has not been changed.",
      );
    }
  }
  function redirect(value: string) {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "paystack.com" ||
        url.hostname.endsWith(".paystack.com")
      )
    )
      throw new ApiError(502, "Invalid payment destination");
    return url.href;
  }
  async function catalog() {
    if (!enabled)
      return {
        enabled: false,
        testMode: true,
        freeLimit,
        proLimit,
        price: null,
      };
    const p = await provider(`/plan/${encodeURIComponent(plan)}`);
    if (
      p.plan_code !== plan ||
      !["monthly", "annually"].includes(p.interval) ||
      !Number.isSafeInteger(p.amount) ||
      p.amount <= 0 ||
      !/^[A-Z]{3}$/.test(p.currency) ||
      p.domain !== (secret.startsWith("sk_live_") ? "live" : "test")
    )
      throw new ApiError(503, "Pro pricing needs configuration");
    return {
      enabled: true,
      testMode: !secret.startsWith("sk_live_"),
      freeLimit,
      proLimit,
      price: {
        amount: p.amount,
        currency: p.currency,
        interval: p.interval as "monthly" | "annually",
      },
    };
  }
  async function state(owner: string) {
    if (!store) throw new ApiError(503, "Billing storage is unavailable");
    return (await store.read(owner)).data;
  }
  async function status(owner: string) {
    const s = store
      ? await state(owner)
      : ({ payments: {}, usage: { month: "", count: 0 } } as BillingState);
    const until = paidUntil(s),
      pro = !!until && Date.parse(until) > Date.now();
    return {
      plan: pro ? "pro" : "free",
      paidUntil: until,
      subscriptionStatus: s.subscriptionStatus || "none",
      canManage: !!s.subscription,
      pendingReference:
        s.checkout && !s.payments[s.checkout.reference]
          ? s.checkout.reference
          : null,
      usage:
        s.usage.month === new Date().toISOString().slice(0, 7)
          ? s.usage.count
          : 0,
      limit: enabled ? (pro ? proLimit : freeLimit) : null,
      payments: Object.entries(s.payments)
        .map(([reference, p]) => ({ reference, ...p }))
        .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
        .slice(0, 24),
    };
  }
  async function refreshSubscription(owner: string, code?: string) {
    const s = await state(owner);
    if (!s.customer || !s.checkout) return;
    if (!code && !s.subscription) {
      const customer = await provider(
        `/customer/${encodeURIComponent(s.customer)}`,
      );
      const matching =
        customer.subscriptions?.filter(
          (sub: any) => sub.plan?.plan_code === s.checkout!.plan,
        ) || [];
      const current = matching.filter(
        (sub: any) =>
          !["cancelled", "completed", "complete"].includes(sub.status),
      );
      const found = current.length ? current : matching.slice(-1);
      if (found?.length > 1)
        throw new ApiError(
          409,
          "Multiple subscriptions need support review before another checkout",
        );
      code = found?.[0]?.subscription_code;
    }
    code ||= s.subscription;
    if (!code) return;
    const observed = Date.now();
    const sub = await provider(`/subscription/${encodeURIComponent(code)}`);
    if (
      sub.customer?.customer_code !== s.customer ||
      sub.plan?.plan_code !== s.checkout.plan
    )
      throw new ApiError(403, "Subscription ownership could not be verified");
    await store!.change(owner, (current) => {
      if ((current.syncedAt || 0) > observed) return current;
      return {
        ...current,
        subscription: code,
        subscriptionStatus: sub.status,
        syncedAt: observed,
      };
    });
  }
  async function verify(reference: string, expectedOwner?: string) {
    if (
      typeof reference !== "string" ||
      !/^[a-zA-Z0-9_.-]{1,150}$/.test(reference)
    )
      throw new ApiError(400, "Invalid payment reference");
    const txn = await provider(
      `/transaction/verify/${encodeURIComponent(reference)}`,
    );
    const checkoutOwner = await store!.find("reference", reference);
    const customer = txn.customer?.customer_code;
    const row =
      checkoutOwner ||
      (typeof customer === "string"
        ? await store!.find("customer", customer)
        : null);
    if (!row) {
      if (expectedOwner)
        throw new ApiError(404, "Payment not found for this account");
      return;
    }
    if (expectedOwner && row.owner_id !== expectedOwner)
      throw new ApiError(404, "Payment not found for this account");
    const c = row.data.checkout;
    const txPlan =
      txn.plan_object?.plan_code || txn.plan?.plan_code || txn.plan;
    if (txn.status !== "success")
      throw new ApiError(
        409,
        "Payment is not confirmed yet. Your Free plan is still available.",
      );
    if (
      !c ||
      txn.reference !== reference ||
      txn.amount !== c.amount ||
      txn.currency !== c.currency ||
      txPlan !== c.plan ||
      txn.domain !== (secret.startsWith("sk_live_") ? "live" : "test") ||
      typeof customer !== "string" ||
      !/^CUS_/.test(customer) ||
      (row.data.customer && row.data.customer !== customer) ||
      (!row.data.customer &&
        txn.customer?.email?.toLowerCase() !== c.email.toLowerCase())
    )
      throw new ApiError(400, "Payment details do not match this subscription");
    const paidAt = txn.paid_at || txn.paidAt;
    const until = periodEnd(paidAt, c.interval);
    if (Date.parse(paidAt) > Date.now() + 60000)
      throw new ApiError(400, "Invalid payment date");
    await store!.change(row.owner_id, (current) => {
      if (current.customer && current.customer !== customer)
        throw new ApiError(409, "Billing account conflict");
      current.customer = customer;
      // A replay never adds another period or reverses a refund/dispute hold.
      if (!current.payments[reference])
        current.payments[reference] = {
          until,
          paidAt: new Date(paidAt).toISOString(),
          amount: txn.amount,
          currency: txn.currency,
          revoked: current.heldReferences?.includes(reference) || false,
        };
      return current;
    });
    await refreshSubscription(row.owner_id);
  }
  async function checkout(owner: string, email: string) {
    const pricing = await catalog();
    if (!pricing.enabled || !pricing.price)
      throw new ApiError(503, "Subscriptions are not open yet");
    await refreshSubscription(owner);
    const current = await state(owner);
    if (
      current.subscription &&
      !["cancelled", "completed", "complete"].includes(
        current.subscriptionStatus || "",
      )
    )
      throw new ApiError(
        409,
        "Manage your existing subscription instead of starting another",
      );
    if ((await status(owner)).plan === "pro")
      throw new ApiError(409, "Your Pro access is already active");
    if (current.checkout && !current.payments[current.checkout.reference]) {
      if (current.checkout.url) return { url: current.checkout.url };
      throw new ApiError(
        409,
        "Checkout is awaiting confirmation. Refresh billing before retrying or contact support.",
      );
    }
    const next: Checkout = {
      reference: `forma-${randomUUID()}`,
      email,
      plan,
      ...pricing.price,
    };
    await store!.change(owner, (s) => {
      if (s.checkout && !s.payments[s.checkout.reference])
        throw new ApiError(
          409,
          "Checkout is already being prepared. Refresh billing.",
        );
      s.checkout = next;
      delete s.subscription;
      delete s.subscriptionStatus;
      delete s.syncedAt;
      return s;
    });
    const result = await provider("/transaction/initialize", {
      email,
      amount: next.amount,
      currency: next.currency,
      plan,
      reference: next.reference,
      channels: ["card"],
      callback_url: `${origin}/account?tab=billing&billing=return`,
      metadata: { forma_user_id: owner },
    });
    if (result.reference !== next.reference)
      throw new ApiError(502, "Payment reference mismatch");
    const url = redirect(result.authorization_url);
    await store!.change(owner, (s) => {
      if (s.checkout?.reference === next.reference) s.checkout.url = url;
      return s;
    });
    return { url };
  }
  async function manage(owner: string) {
    await refreshSubscription(owner);
    const s = await state(owner);
    if (!s.subscription)
      throw new ApiError(
        409,
        "Your subscription is still syncing. Refresh billing shortly.",
      );
    return {
      url: redirect(
        (
          await provider(
            `/subscription/${encodeURIComponent(s.subscription)}/manage/link`,
          )
        ).link,
      ),
    };
  }
  async function consume(owner: string) {
    if (!enabled) return;
    const month = new Date().toISOString().slice(0, 7);
    await store!.change(owner, (s) => {
      const until = paidUntil(s),
        limit = until && Date.parse(until) > Date.now() ? proLimit : freeLimit;
      if (s.usage.month !== month) s.usage = { month, count: 0 };
      if (s.usage.count >= limit)
        throw new ApiError(
          402,
          "Your monthly analysis allowance is used. Open Billing to view your plan.",
          "PLAN_LIMIT",
        );
      s.usage.count++;
      return s;
    });
  }
  async function webhook(raw: Buffer, signature?: string) {
    if (!store || !validSignature(raw, signature, secret))
      throw new ApiError(401, "Invalid webhook signature");
    let event: any;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      throw new ApiError(400, "Invalid event");
    }
    const d = event.data;
    if (event.event === "charge.success" && d?.reference)
      await verify(d.reference);
    else if (
      [
        "subscription.create",
        "subscription.disable",
        "subscription.not_renew",
        "invoice.payment_failed",
        "invoice.update",
      ].includes(event.event)
    ) {
      const customer = d?.customer?.customer_code;
      const row = customer && (await store.find("customer", customer));
      if (row) {
        if (d.transaction?.status === "success" && d.transaction.reference)
          await verify(d.transaction.reference);
        await refreshSubscription(
          row.owner_id,
          d.subscription_code || d.subscription?.subscription_code,
        );
      }
    } else if (
      ["refund.processed", "charge.dispute.create"].includes(event.event)
    ) {
      let ref = d?.transaction?.reference;
      if (
        !ref &&
        (typeof d?.transaction === "number" ||
          typeof d?.transaction?.id === "number")
      ) {
        ref = (
          await provider(
            `/transaction/${encodeURIComponent(d.transaction.id || d.transaction)}`,
          )
        ).reference;
      }
      if (ref) {
        const txn = await provider(
          `/transaction/verify/${encodeURIComponent(ref)}`,
        );
        const row =
          (await store.find("customer", txn.customer?.customer_code || "")) ||
          (await store.find("reference", ref));
        if (row)
          await store.change(row.owner_id, (s) => {
            s.heldReferences = [...new Set([...(s.heldReferences || []), ref])];
            if (s.payments[ref]) s.payments[ref].revoked = true;
            return s;
          });
      }
    }
  }
  async function canDelete(owner: string) {
    if (!store) return;
    const s = await state(owner);
    if (!s.customer && !s.checkout) return;
    if (s.checkout && !s.payments[s.checkout.reference])
      throw new ApiError(
        409,
        "Resolve the pending checkout with support before deleting this account",
      );
    await refreshSubscription(owner);
    const updated = await state(owner);
    if (
      !updated.subscription ||
      !["non-renewing", "cancelled", "completed", "complete"].includes(
        updated.subscriptionStatus || "",
      )
    )
      throw new ApiError(
        409,
        "Cancel renewal in Billing and refresh its status before deleting your account",
      );
  }
  return {
    enabled,
    catalog,
    status,
    checkout,
    verify,
    manage,
    consume,
    webhook,
    refreshSubscription,
    canDelete,
  };
}
