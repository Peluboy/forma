// Read-only public API preflight. No credentials or record contents are printed.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.");
  process.exit(1);
}
let failed = false;
for (const path of [
  "/auth/v1/settings",
  "/rest/v1/forma_records?select=id&limit=0",
  "/rest/v1/forma_preferences?select=owner_id&limit=0",
]) {
  try {
    const response = await fetch(new URL(path, url), {
      headers: { apikey: key },
      signal: AbortSignal.timeout(12000),
      redirect: "error",
    });
    const body = await response.json();
    const result = { path, status: response.status, code: body.code || null };
    if (response.ok && path.includes("settings")) {
      Object.assign(result, {
        emailEnabled: body.external?.email,
        signupDisabled: body.disable_signup,
        emailConfirmationRequired: !body.mailer_autoconfirm,
      });
    }
    // Denial can be expected for private tables; it does not verify owner RLS.
    if (!response.ok && (path.includes("settings") || ![401, 403].includes(response.status))) failed = true;
    console.log(JSON.stringify(result));
  } catch (error) {
    failed = true;
    console.error(JSON.stringify({ path, error: error.cause?.code || error.name }));
  }
}
console.log("Public preflight only: verify schema, grants and two-account isolation separately.");
process.exitCode = failed ? 1 : 0;
