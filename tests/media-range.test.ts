import { test, TestContext } from "node:test";
import { parseMediaRange } from "../src/media-type.js";

test("[1] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/json");
  t.assert.strictEqual(mediaRange![0]!.mediaType, "application/json");
});

test("[2] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/json,");
  t.assert.strictEqual(mediaRange, undefined);
});

test("[3] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/json , text/html");
  t.assert.strictEqual(mediaRange!.length, 2);
});

test("[4] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/json,text/html");
  t.assert.strictEqual(mediaRange!.length, 2);
});

test("[5] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("*/*,text/html");
  t.assert.strictEqual(mediaRange!.length, 2);
});

test("[6] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("*/html,text/html");
  t.assert.strictEqual(mediaRange, undefined);
});

test("[7] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/*");
  t.assert.strictEqual(mediaRange![0]!.mediaType, "application/*");
});

test("[8] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/*; a=b;c=d , text/html; e=f");
  t.assert.strictEqual(mediaRange![0]!.parameters["a"], "b");
  t.assert.strictEqual(mediaRange![1]!.parameters["e"], "f");
});

test("[9] mediaRange", (t: TestContext) => {
  const mediaRange = parseMediaRange("application/json , a=b");
  t.assert.strictEqual(mediaRange, undefined);
});
