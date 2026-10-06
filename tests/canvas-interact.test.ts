import test from "node:test";
import assert from "node:assert/strict";
import {
  clampBox,
  moveBox,
  resizeBox,
} from "../src/features/editor/lib/canvasInteract.js";

test("moveBox clamps inside the design page", () => {
  const box = { x: 10, y: 10, width: 100, height: 80 };
  assert.deepEqual(moveBox(box, -50, -50), {
    x: 0,
    y: 0,
    width: 100,
    height: 80,
  });
  assert.deepEqual(moveBox(box, 900, 900), {
    x: 620,
    y: 820,
    width: 100,
    height: 80,
  });
});

test("resizeBox grows and shrinks from each side with a minimum size", () => {
  const box = { x: 100, y: 100, width: 200, height: 120 };
  const se = resizeBox(box, "se", 40, 30);
  assert.equal(se.width, 240);
  assert.equal(se.height, 150);
  const nw = resizeBox(box, "nw", 40, 30);
  assert.equal(nw.x, 140);
  assert.equal(nw.y, 130);
  assert.equal(nw.width, 160);
  assert.equal(nw.height, 90);
  const tiny = resizeBox(box, "se", -500, -500);
  assert.equal(tiny.width, 24);
  assert.equal(tiny.height, 24);
});

test("clampBox keeps geometry on the artboard", () => {
  const clamped = clampBox({ x: -20, y: 880, width: 400, height: 400 });
  assert.equal(clamped.x, 0);
  assert.ok(clamped.y + clamped.height <= 900);
  assert.ok(clamped.width >= 24);
});
