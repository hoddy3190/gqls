import { readFileSync } from "node:fs";
import * as fs from "node:fs/promises";
import { exit } from "node:process";
const specMarkdown = require("spec-md");

type SpecIgnoreData = Record<string, string>;
type SpecIdInImpleFiles = Record<string, [string, number][]>;

// JSON ファイルを読み込む関数
function readJsonFile(filePath: string): SpecIgnoreData {
  const fileContent = readFileSync(filePath, "utf-8");
  const jsonData: SpecIgnoreData = JSON.parse(fileContent);
  return jsonData;
}

async function extractLines(
  filePath: string,
  specIdInImplFiles: SpecIdInImpleFiles
): Promise<SpecIdInImpleFiles> {
  const startRegex = /^\s*\/\/\s*\@spec:/;
  //   const regex = /\/\/\s*\@spec:\s*(S\d+)(\s*,\s*(S\d+))*$/;
  const specIdRegex = /S\d+/g;

  const file = await fs.open(filePath);

  let lineNum = 1;

  for await (const line of file.readLines()) {
    if (!startRegex.test(line)) {
      continue;
    }
    const result = line.match(specIdRegex);
    if (!result) {
      console.log(`${filePath}, ${lineNum} | result is null`);
      continue;
    }
    for (let i = 0; i < result.length; i++) {
      const specId = result[i];
      if (specId === undefined) {
        console.log(`${filePath}, ${lineNum} | specId is undefined`);
        continue;
      }
      if (!specIdInImplFiles[specId]) {
        specIdInImplFiles[specId] = [];
      }
      specIdInImplFiles[specId].push([filePath, lineNum]);
    }
    lineNum++;
  }

  return specIdInImplFiles;
}

async function writeSpecDocument(
  filePath: string,
  specIgnoreData: SpecIgnoreData,
  specIdInImplFiles: SpecIdInImpleFiles
): error | null {
  const file = await fs.open(filePath);

  const pattern = /^\*\*(S\d+)\*\*$/;

  let writeLines = [];
  let notYetImplemented = [];

  for await (const line of file.readLines()) {
    const match = line.match(pattern);
    if (!match) {
      writeLines.push(line);
      continue;
    }
    const specId = match[1];
    if (specId === undefined) {
      return new Error(`specId is undefined: ${line}`);
    }
    if (specIgnoreData[specId]) {
      writeLines.push(line + " | ignored");
    } else if (specIdInImplFiles[specId]) {
      const filePathAndLineNumList = specIdInImplFiles[specId].map<string>(
        ([filePath, lineNum]) => {
          return `${filePath}:${lineNum}`;
        }
      );
      writeLines.push(
        line + " | implemented at " + filePathAndLineNumList.join(", ")
      );
    } else {
      writeLines.push(line + " | not yet implemented");
      notYetImplemented.push(specId);
    }
  }

  if (notYetImplemented.length > 0) {
    console.log("Not yet implemented: ", notYetImplemented);
    // exit(1);
  }

  const writeFilePath =
    "/Users/hodaka.suzuki/ghq/github.com/hoddy3190/gqls/spec/write.md";
  fs.writeFile(writeFilePath, writeLines.join("\n"));
}

async function main(): Promise<void> {
  const specIgnoreFilePath =
    "/Users/hodaka.suzuki/ghq/github.com/hoddy3190/gqls/spec/spec-ignore.json";
  const specIgnoreData = readJsonFile(specIgnoreFilePath);
  console.log(specIgnoreData);

  let specIdInImplFiles: Record<string, [string, number][]> = {};
  for await (const entry of fs.glob("src/**/*.ts", {
    cwd: "/Users/hodaka.suzuki/ghq/github.com/hoddy3190/gqls/",
  })) {
    specIdInImplFiles = await extractLines(entry, specIdInImplFiles);
  }
  console.log(specIdInImplFiles);

  const specPath =
    "/Users/hodaka.suzuki/ghq/github.com/hoddy3190/gqls/doc/GraphQLOverHttp_with_id.md";
  writeSpecDocument(specPath, specIgnoreData, specIdInImplFiles);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
