import { spawnSync } from "node:child_process";

let url;
try {
  url = new URL(process.env.SUPABASE_DB_URL || "");
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error();
} catch {
  console.error("Set SUPABASE_DB_URL to a PostgreSQL connection URI in .env.");
  process.exit(1);
}
// Pass credentials through the child environment, never command arguments or logs.
const result = spawnSync("psql", ["-X", "--no-password", "-v", "ON_ERROR_STOP=1", "-f", "supabase/inspect.sql"], {
  encoding: "utf8",
  env: {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)) || "postgres",
    PGCONNECT_TIMEOUT: "12",
    PGSSLMODE: "require",
  },
});
if (result.error || result.status !== 0) {
  const error = result.stderr || "";
  const reason = /No route to host|Network is unreachable/i.test(error)
    ? "Database host is unreachable. Use the Supabase Session pooler URI if this network lacks IPv6."
    : /password authentication failed/i.test(error)
      ? "Database credentials were rejected. Verify the pooler username and password."
      : /could not translate|nodename nor servname/i.test(error)
        ? "Database hostname could not be resolved."
        : result.error?.code === "ENOENT"
          ? "Install the PostgreSQL psql client before inspection."
          : "Database inspection failed. Check connection settings, TLS, network access and database permissions.";
  // libpq errors can echo a connection string; never print raw stderr.
  console.error(reason);
  process.exit(1);
}
console.log(result.stdout);
