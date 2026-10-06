import type { DatabaseSync } from "node:sqlite";
import { createClient } from "@supabase/supabase-js";
import { ApiError } from "../store.js";

export type Checkout = {
  reference: string;
  email: string;
  amount: number;
  currency: string;
  plan: string;
  interval: "monthly" | "annually";
  url?: string;
};
export type BillingState = {
  customer?: string;
  subscription?: string;
  subscriptionStatus?: string;
  syncedAt?: number;
  heldReferences?: string[];
  checkout?: Checkout;
  payments: Record<
    string,
    {
      until: string;
      amount: number;
      currency: string;
      paidAt: string;
      revoked?: boolean;
    }
  >;
  usage: { month: string; count: number };
};
export const emptyBilling = (): BillingState => ({
  payments: {},
  usage: { month: "", count: 0 },
});
export type BillingRow = {
  owner_id: string;
  data: BillingState;
  version: number;
};
export interface BillingStore {
  read(owner: string): Promise<BillingRow>;
  find(
    field: "customer" | "reference",
    value: string,
  ): Promise<BillingRow | null>;
  change(
    owner: string,
    change: (state: BillingState) => BillingState,
  ): Promise<BillingState>;
}
export function billingStore(db?: DatabaseSync): BillingStore | null {
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!db && !service) return null;
  const client = db
    ? null
    : createClient(process.env.SUPABASE_URL!, service!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
  db?.exec(
    `CREATE TABLE IF NOT EXISTS billing_states(owner_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,data TEXT NOT NULL,version INTEGER NOT NULL,customer TEXT UNIQUE,reference TEXT UNIQUE);`,
  );
  const decode = (row: any): BillingRow | null =>
    row
      ? {
          owner_id: row.owner_id,
          data: typeof row.data === "string" ? JSON.parse(row.data) : row.data,
          version: row.version,
        }
      : null;
  const checked = (r: any) => {
    if (r.error)
      throw new ApiError(503, "Billing storage is temporarily unavailable");
    return r.data;
  };
  const store: BillingStore = {
    async read(owner) {
      const row = db
        ? db.prepare("SELECT * FROM billing_states WHERE owner_id=?").get(owner)
        : checked(
            await client!
              .from("forma_billing")
              .select("*")
              .eq("owner_id", owner)
              .maybeSingle(),
          );
      return (
        decode(row) || { owner_id: owner, data: emptyBilling(), version: 0 }
      );
    },
    async find(field, value) {
      return decode(
        db
          ? db
              .prepare(`SELECT * FROM billing_states WHERE ${field}=?`)
              .get(value)
          : checked(
              await client!
                .from("forma_billing")
                .select("*")
                .eq(field, value)
                .maybeSingle(),
            ),
      );
    },
    async change(owner, update) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const old = await store.read(owner);
        const next = update(structuredClone(old.data));
        let applied: boolean;
        if (db) {
          const result =
            old.version === 0
              ? db
                  .prepare(
                    "INSERT INTO billing_states(owner_id,data,version,customer,reference) VALUES(?,?,1,?,?) ON CONFLICT(owner_id) DO NOTHING",
                  )
                  .run(
                    owner,
                    JSON.stringify(next),
                    next.customer || null,
                    next.checkout?.reference || null,
                  )
              : db
                  .prepare(
                    "UPDATE billing_states SET data=?,version=version+1,customer=?,reference=? WHERE owner_id=? AND version=?",
                  )
                  .run(
                    JSON.stringify(next),
                    next.customer || null,
                    next.checkout?.reference || null,
                    owner,
                    old.version,
                  );
          applied = Number(result.changes) === 1;
        } else
          applied = checked(
            await client!.rpc("forma_billing_save", {
              p_owner: owner,
              p_expected: old.version,
              p_data: next,
            }),
          );
        if (applied) return next;
      }
      throw new ApiError(
        409,
        "Billing changed in another request. Please retry.",
      );
    },
  };
  return store;
}
