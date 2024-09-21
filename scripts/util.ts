import * as fs from "node:fs/promises";

export type SpecMap = Record<string, [string, number][]>;

export const SPEC_FILE_PATH = "spec/GraphQLOverHttp_with_id.md";
const IMPL_FILES_PATTERN = "{src,tests}/**/*.ts";
const IGNORE_IMPL_FILE = "src/graphql-js.ts";
const SPEC_IGNORE_FILE_PATH = "spec/spec-ignore.json";

export async function extractSpecIds(
  filePath: string,
  specMap: SpecMap,
  lineRegex: RegExp,
  specIdRegex: RegExp = /S\d+/g
): Promise<SpecMap> {
  const file = await fs.open(filePath);
  let lineNum = 0;

  for await (const line of file.readLines()) {
    lineNum++;
    if (!lineRegex.test(line)) continue;

    const result = line.match(specIdRegex);
    if (!result) {
      console.warn(`${filePath}:${lineNum}:"${line}", no specIds found`);
      continue;
    }

    for (const specId of result) {
      if (specMap[specId] === undefined) specMap[specId] = [];
      specMap[specId].push([filePath, lineNum]);
    }
  }

  return specMap;
}

export async function makeSpecMap(): Promise<SpecMap> {
  return await extractSpecIds(SPEC_FILE_PATH, {}, /^\*\*S/);
}

export async function makeImpledSpecMap(): Promise<SpecMap> {
  let impledSpecMap: SpecMap = {};
  for await (const entry of fs.glob(IMPL_FILES_PATTERN)) {
    if (entry.includes(IGNORE_IMPL_FILE)) continue;
    impledSpecMap = await extractSpecIds(
      entry,
      impledSpecMap,
      /^.*\/\/\s*\@spec:/,
      /(S\d+)/g
    );
  }
  return impledSpecMap;
}

export async function makeIgnoredSpecMap(): Promise<SpecMap> {
  return await extractSpecIds(SPEC_IGNORE_FILE_PATH, {}, /^\s*\"S/);
}
