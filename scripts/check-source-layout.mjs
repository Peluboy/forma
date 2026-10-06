import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";

const root = resolve("src");
const allowedRootFiles = new Set(["main.tsx", "env.d.ts"]);
const sourceExtensions = new Set([".ts", ".tsx"]);
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (sourceExtensions.has(extname(path))) files.push(path);
  }
}

await collect(root);
const errors = [];
for (const file of files) {
  const path = relative(root, file);
  const source = await readFile(file, "utf8");
  if (!path.includes(sep) && !allowedRootFiles.has(path)) {
    errors.push(`${path}: place feature or domain code in its owning folder`);
  }
  if (extname(file) === ".tsx" && source.split(/\r?\n/).length - 1 > 1000) {
    errors.push(`${path}: split React modules above 1,000 lines by responsibility`);
  }
  if (!path.startsWith(`domain${sep}`)) continue;
  const imports = source.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g);
  for (const [, specifier] of imports) {
    const target = resolve(dirname(file), specifier);
    if (!target.startsWith(`${join(root, "domain")}${sep}`)) {
      errors.push(`${path}: domain import escapes into ${relative(root, target)}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Source layout OK (${files.length} TypeScript files)`);
}
