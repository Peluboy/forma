import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// A fresh local adapter avoids test accounts and rate limits in the user's workspace.
export default defineConfig(base, {
  use: { ...base.use, baseURL: "http://127.0.0.1:5181" },
  webServer: {
    command: "node --import tsx scripts/test-server.ts",
    url: "http://127.0.0.1:5181",
    reuseExistingServer: false,
    env: {
      NODE_ENV: "test",
      PORT: "5181",
      FORMA_MODE: "local",
      FORMA_DB_PATH: ":memory:",
      FORMA_BILLING_ENABLED: "false",
      APP_ORIGIN: "http://127.0.0.1:5181",
    },
  },
});
