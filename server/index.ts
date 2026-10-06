import { createApp } from "./app.js";
import express from "express";
import { resolve } from "node:path";
const app = await createApp();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
}
const port = Number(process.env.PORT || 8787);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(`Forma API listening on http://127.0.0.1:${port}`),
);
process.on("SIGTERM", () =>
  server.close(() => {
    app.locals.close();
    process.exit(0);
  }),
);
