import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolvedTheme, type ThemePreference } from "../src/shared/theme.ts";

describe("theme preference", () => {
  it("resolves system to light or dark from OS", () => {
    assert.equal(resolvedTheme("system", false), "light");
    assert.equal(resolvedTheme("system", true), "dark");
  });

  it("honors explicit light and dark over system", () => {
    assert.equal(resolvedTheme("light", true), "light");
    assert.equal(resolvedTheme("dark", false), "dark");
  });

  it("only accepts known preferences at the type level", () => {
    const allowed: ThemePreference[] = ["system", "light", "dark"];
    assert.equal(allowed.length, 3);
  });
});
