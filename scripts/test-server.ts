import express from "express";
import { resolve } from "node:path";
import { createApp } from "../server/app.js";

if (process.env.NODE_ENV !== "test")
  throw new Error("Test server requires NODE_ENV=test");
const app = await createApp({ mode: "local", dbPath: ":memory:" });
app.use(express.static(resolve("dist")));
app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
const server = app.listen(5181, "127.0.0.1");
process.on("SIGTERM", () =>
  server.close(() => {
    app.locals.close();
    process.exit(0);
  }),
);
