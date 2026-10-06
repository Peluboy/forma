import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createApp } from "../server/app.ts";
import { periodEnd, validSignature } from "../server/billing/paystack.ts";

test("Paystack signatures cover the original bytes and calendar billing handles month ends", () => {
  const body = Buffer.from('{ "event": "charge.success" }');
  const sig = createHmac("sha512", "secret").update(body).digest("hex");
  assert.equal(validSignature(body, sig, "secret"), true);
  assert.equal(validSignature(Buffer.from("{}"), sig, "secret"), false);
  assert.equal(validSignature(body, "bad", "secret"), false);
  assert.equal(
    periodEnd("2026-01-31T10:00:00Z", "monthly"),
    "2026-02-28T10:00:00.000Z",
  );
  assert.equal(
    periodEnd("2024-02-29T10:00:00Z", "annually"),
    "2025-02-28T10:00:00.000Z",
  );
});

test("billing API verifies ownership, duplicate checkout/events, cancellations, renewals, refunds and quotas", async () => {
  const env = {
    FORMA_BILLING_ENABLED: "true",
    PAYSTACK_SECRET_KEY: "sk_test_fixture",
    PAYSTACK_PRO_PLAN_CODE: "PLN_fixture",
    FORMA_FREE_ANALYSES_PER_MONTH: "0",
    FORMA_PRO_ANALYSES_PER_MONTH: "2",
    APP_ORIGIN: "http://127.0.0.1:5173",
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, env);
  let ref = "",
    email = "",
    subscriptionStatus = "active",
    txnStatus = "success",
    wrongAmount = false,
    initializationCount = 0;
  let paidAt = new Date().toISOString();
  const provider = (async (input: any, init: any) => {
    const path = new URL(String(input)).pathname;
    assert.equal(init.headers.Authorization, "Bearer sk_test_fixture");
    let data: any;
    if (path === "/plan/PLN_fixture")
      data = {
        plan_code: "PLN_fixture",
        amount: 100000,
        currency: "NGN",
        interval: "monthly",
        domain: "test",
      };
    else if (path === "/transaction/initialize") {
      initializationCount++;
      const body = JSON.parse(init.body);
      ref = body.reference;
      email = body.email;
      assert.equal(body.plan, "PLN_fixture");
      assert.equal(body.amount, 100000);
      data = {
        reference: ref,
        authorization_url: "https://checkout.paystack.com/fixture",
      };
    } else if (path.startsWith("/transaction/verify/"))
      data = {
        status: txnStatus,
        reference: path.split("/").at(-1),
        domain: "test",
        amount: wrongAmount ? 1 : 100000,
        currency: "NGN",
        plan_object: { plan_code: "PLN_fixture" },
        paid_at: paidAt,
        customer: { customer_code: "CUS_fixture", email },
      };
    else if (path === "/customer/CUS_fixture")
      data = {
        subscriptions: [
          {
            subscription_code: "SUB_fixture",
            status: subscriptionStatus,
            plan: { plan_code: "PLN_fixture" },
          },
        ],
      };
    else if (path === "/subscription/SUB_fixture")
      data = {
        subscription_code: "SUB_fixture",
        status: subscriptionStatus,
        plan: { plan_code: "PLN_fixture" },
        customer: { customer_code: "CUS_fixture" },
      };
    else if (path === "/subscription/SUB_fixture/manage/link")
      data = { link: "https://paystack.com/manage/subscriptions/fixture" };
    else throw new Error(`Unexpected Paystack call ${path}`);
    return new Response(JSON.stringify({ status: true, data }), {
      status: 200,
    });
  }) as typeof fetch;
  const app = await createApp({
    dbPath: ":memory:",
    mode: "local",
    billingRequest: provider,
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  let cookie = "",
    csrf = "";
  async function call(path: string, body?: any, extra: any = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
    };
  }
  async function webhook(event: string, data: any, valid = true) {
    const body = JSON.stringify({ event, data });
    const sig = createHmac("sha512", env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest("hex");
    return fetch(base + "/billing/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-paystack-signature": valid ? sig : "0".repeat(128),
      },
      body,
    });
  }
  try {
    assert.equal((await call("/billing")).status, 401);
    assert.equal((await call("/billing/checkout", {})).status, 401);
    const register = await call("/auth/register", {
      name: "Subscriber",
      email: "subscriber@example.test",
      password: "long-password-123",
    });
    cookie = register.cookie;
    csrf = register.data.csrfToken;
    const ownerCookie = cookie,
      ownerCsrf = csrf;
    assert.equal((await call("/billing")).data.plan, "free");
    assert.equal((await call("/billing/plans")).data.price.amount, 100000);
    assert.equal(
      (await call("/billing/checkout", {}, { "X-CSRF-Token": "bad" })).status,
      403,
    );
    const checkouts = await Promise.all([
      call("/billing/checkout", { amount: 1, plan: "evil" }),
      call("/billing/checkout", {}),
    ]);
    assert.ok(checkouts.some((c) => c.status === 200));
    assert.equal(initializationCount, 1);
    assert.equal((await call("/billing")).data.plan, "free");
    assert.equal(
      (await webhook("charge.success", { reference: ref }, false)).status,
      401,
    );
    assert.equal((await call("/billing")).data.plan, "free");
    wrongAmount = true;
    assert.equal(
      (await call("/billing/verify", { reference: ref })).status,
      400,
    );
    wrongAmount = false;
    txnStatus = "pending";
    assert.equal(
      (await call("/billing/verify", { reference: ref })).status,
      409,
    );
    txnStatus = "success";
    cookie = "";
    csrf = "";
    const other = await call("/auth/register", {
      name: "Other",
      email: "other@example.test",
      password: "long-password-123",
    });
    cookie = other.cookie;
    csrf = other.data.csrfToken;
    assert.equal(
      (await call("/billing/verify", { reference: ref })).status,
      404,
    );
    cookie = ownerCookie;
    csrf = ownerCsrf;
    assert.equal(
      (await call("/billing/verify", { reference: ref })).status,
      200,
    );
    const active = (await call("/billing")).data;
    assert.equal(active.plan, "pro");
    assert.equal(active.limit, 2);
    assert.equal(active.payments.length, 1);
    assert.equal(
      (await webhook("charge.success", { reference: ref })).status,
      200,
    );
    assert.equal(
      (await webhook("charge.success", { reference: ref })).status,
      200,
    );
    assert.equal((await call("/billing")).data.paidUntil, active.paidUntil);
    assert.equal((await call("/billing/checkout", {})).status, 409);
    assert.equal(
      (await call("/billing/manage", {})).data.url,
      "https://paystack.com/manage/subscriptions/fixture",
    );
    const deletion = await fetch(base + "/account", {
      method: "DELETE",
      headers: { Cookie: cookie, "X-CSRF-Token": csrf },
    });
    assert.equal(deletion.status, 409);
    subscriptionStatus = "non-renewing";
    await webhook("subscription.not_renew", {
      subscription_code: "SUB_fixture",
      customer: { customer_code: "CUS_fixture" },
    });
    assert.equal((await call("/billing")).data.plan, "pro");
    assert.equal(
      (await call("/billing")).data.subscriptionStatus,
      "non-renewing",
    );
    // Started attempts count even if the analysis provider later rejects the image.
    const image = "data:image/png;base64,aGVsbG8=";
    await Promise.all(
      Array.from({ length: 2 }, () =>
        call("/reference/analyze", { image, provider: "local" }),
      ),
    );
    assert.equal(
      (await call("/reference/analyze", { image, provider: "local" })).status,
      402,
    );
    assert.equal((await call("/billing")).data.usage, 2);
    subscriptionStatus = "attention";
    await webhook("invoice.payment_failed", {
      subscription: { subscription_code: "SUB_fixture" },
      customer: { customer_code: "CUS_fixture" },
    });
    assert.equal((await call("/billing")).data.subscriptionStatus, "attention");
    await webhook("refund.processed", { transaction: { reference: ref } });
    assert.equal((await call("/billing")).data.plan, "free");
    await webhook("charge.success", { reference: ref });
    assert.equal((await call("/billing")).data.plan, "free");
    // A late historical renewal cannot grant access today.
    paidAt = "2020-01-01T00:00:00.000Z";
    await webhook("charge.success", { reference: "renewal-old" });
    assert.equal((await call("/billing")).data.plan, "free");
    paidAt = new Date().toISOString();
    subscriptionStatus = "active";
    await webhook("charge.success", { reference: "renewal-new" });
    assert.equal((await call("/billing")).data.plan, "pro");
    assert.equal((await call("/billing")).data.payments.length, 3);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    app.locals.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
