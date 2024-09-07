import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import { describe, it, suite } from "node:test";

type SpecMap = Record<string, [string, number][]>;

const SPEC_FILE_PATH = "spec/GraphQLOverHttp_with_id.md";
const IMPL_FILES_PATTERN = "src/**/*.ts";
const SPEC_IGNORE_FILE_PATH = "spec/spec-ignore.json";

async function extractSpecIds(
  filePath: string,
  specMap: SpecMap,
  lineRegex: RegExp,
  specIdRegex: RegExp = /S\d+/
): Promise<SpecMap> {
  const file = await fs.open(filePath);
  let lineNum = 1;

  for await (const line of file.readLines()) {
    if (!lineRegex.test(line)) continue;

    const result = line.match(specIdRegex);
    if (!result) {
      console.warn(`${filePath}:${lineNum}, no specIds found`);
      continue;
    }

    for (const specId of result) {
      if (!specMap[specId]) specMap[specId] = [];
      specMap[specId].push([filePath, lineNum]);
    }

    lineNum++;
  }

  return specMap;
}

async function makeSpecMap(): Promise<SpecMap> {
  return await extractSpecIds(SPEC_FILE_PATH, {}, /^\*\*/);
}

async function makeImpledSpecMap(): Promise<SpecMap> {
  let impledSpecMap: SpecMap = {};
  for await (const entry of fs.glob(IMPL_FILES_PATTERN)) {
    impledSpecMap = await extractSpecIds(
      entry,
      impledSpecMap,
      /^\s*\/\/\s*\@spec:/,
      /S\d+/g
    );
  }
  return impledSpecMap;
}

async function makeIgnoredSpecMap(): Promise<SpecMap> {
  return await extractSpecIds(SPEC_IGNORE_FILE_PATH, {}, /^\s*\"/);
}

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
