import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import { exec } from "node:child_process";
import {
  makeIgnoredSpecMap,
  makeImpledSpecMap,
  SPEC_FILE_PATH,
  SpecMap,
} from "./util.js";

const GH_PAGE_INDEX_PATH = "docs/index.html";
const GITHUB_URL = JSON.parse(readFileSync("./package.json", "utf-8")).homepage;

async function appendReferenceToSpecDocument(
  filePath: string,
  impledSpecMap: SpecMap,
  ignoredSpecMap: SpecMap,
): Promise<string[]> {
  const file = await fs.open(filePath);

  const pattern = /^\*\*(S\d+)\*\*$/;

  const writeLines: string[] = [];

  for await (const line of file.readLines()) {
    const match = line.match(pattern);
    if (!match) {
      writeLines.push(line);
      continue;
    }
    const specId = match[1];
    if (specId === undefined) {
      throw new Error(`specId is undefined: ${line}`);
    }

    if (impledSpecMap[specId] !== undefined) {
      const filePathAndLineNumList = impledSpecMap[specId].map<string>(
        ([filePath, lineNum]) => {
          return `[${filePath}:${lineNum}](${GITHUB_URL}/blob/main/${filePath}#L${lineNum})`;
        },
      );

      writeLines.push(
        line + " | implemented at " + filePathAndLineNumList.join(", "),
      );
    } else if (ignoredSpecMap[specId] !== undefined) {
      const [filePath, lineNum] = ignoredSpecMap[specId][0]!;
      writeLines.push(
        `${line} | ignored at [${filePath}:${lineNum}](${GITHUB_URL}/blob/main/${filePath}#L${lineNum})`,
      );
    } else {
      throw new Error(`specId: ${specId} is not implemented yet`);
    }
  }

  return writeLines;
}

async function main(): Promise<void> {
  const impledSpecIdSet = await makeImpledSpecMap();
  const ignoredSpecIdSet = await makeIgnoredSpecMap();
  const lines = await appendReferenceToSpecDocument(
    SPEC_FILE_PATH,
    impledSpecIdSet,
    ignoredSpecIdSet,
  );
  fs.writeFile("spec/tmp.md", lines.join("\n"));
  exec(`npx spec-md spec/tmp.md > ${GH_PAGE_INDEX_PATH}`, () => {
    exec("rm spec/tmp.md");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
