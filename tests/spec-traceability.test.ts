import assert from "node:assert/strict";
import { describe, it, suite } from "node:test";
import {
  makeIgnoredSpecMap,
  makeImpledSpecMap,
  makeSpecMap,
} from "../scripts/util.js";

suite("Spec Ids Traceability", async () => {
  const specIdSet = new Set(Object.keys(await makeSpecMap()));
  const impledSpecIdSet = new Set(Object.keys(await makeImpledSpecMap()));
  const ignoredSpecIdSet = new Set(Object.keys(await makeIgnoredSpecMap()));

  describe("All spec ids in the specification file", () => {
    it("should appear in spec-ignore.json or implementation files", async () => {
      const danglingSpecSet = specIdSet.difference(
        impledSpecIdSet.union(ignoredSpecIdSet)
      );
      const message = `${[...danglingSpecSet].join(", ")} is/are not implemented nor ignored`;
      assert.strictEqual(danglingSpecSet.size, 0, message);
    });
  });

  describe("All spec ids in the source files", () => {
    it("should be defined in the specification file", async () => {
      const notDefined = impledSpecIdSet.difference(specIdSet);
      const message = `${[...notDefined].join(", ")} is/are not defined in the specification file`;
      assert.strictEqual(notDefined.size, 0, message);
    });
  });

  describe("All ignored spec ids", async () => {
    it("should not appear in implementation files", async () => {
      const intersection = impledSpecIdSet.intersection(ignoredSpecIdSet);
      const message = `${[...intersection].join(", ")} is/are ignored but implemented`;
      assert.strictEqual(intersection.size, 0, message);
    });

    it("should be defined in the specification file", async () => {
      const notDefined = ignoredSpecIdSet.difference(specIdSet);
      const message = `${[...notDefined].join(", ")} is/are not defined in the specification file`;
      assert.strictEqual(notDefined.size, 0, message);
    });
  });
});
