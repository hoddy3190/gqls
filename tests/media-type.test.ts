import { test, describe, TestContext } from "node:test";

import { parseMediaType } from "../src/media-type.js";

test("mediaType aa", (t: TestContext) => {
  const mediaType = parseMediaType("application/json");
  t.assert.strictEqual(mediaType!.mediaType, "application/json");
});

test("mediaType break line", (t: TestContext) => {
  const mediaType = parseMediaType(
    `applicat
ion/json`,
  );
  t.assert.strictEqual(mediaType, undefined);
});

test("mediaType empty", (t: TestContext) => {
  const mediaType = parseMediaType("");
  t.assert.strictEqual(mediaType, undefined);
});

test("mediaType slash not exist", (t: TestContext) => {
  const mediaType = parseMediaType("text");
  t.assert.strictEqual(mediaType, undefined);
});

test("slash is not found", (t: TestContext) => {
  const mediaType = parseMediaType("texthtml");
  t.assert.strictEqual(mediaType, undefined);
});

test("type is not token", (t: TestContext) => {
  const mediaType = parseMediaType("appl@ication/json");
  t.assert.strictEqual(mediaType, undefined);
});

test("subtype is not token", (t: TestContext) => {
  const mediaType = parseMediaType("application/js@on");
  t.assert.strictEqual(mediaType, undefined);
});

test("spaces should be trimmed", (t: TestContext) => {
  const mediaType = parseMediaType("   application/json    ");
  t.assert.strictEqual(mediaType!.mediaType, "application/json");
});

test("upper cases should be lower", (t: TestContext) => {
  const mediaType = parseMediaType("AppLicatioN/JSON");
  t.assert.strictEqual(mediaType?.mediaType, "application/json");
});

test("type is not found", (t: TestContext) => {
  const mediaType = parseMediaType("/texthtml");
  t.assert.strictEqual(mediaType, undefined);
});

test("subtype is not found", (t: TestContext) => {
  const mediaType = parseMediaType("textplain/");
  t.assert.strictEqual(mediaType, undefined);
});

test("with parameter", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;  a=b;   c=d");

  t.assert.strictEqual(mediaType!.mediaType, "text/html");
  t.assert.strictEqual(Object.keys(mediaType!.parameters).length, 2);
  t.assert.strictEqual(mediaType!.parameters["a"], "b");
  t.assert.strictEqual(mediaType!.parameters["c"], "d");
});

test("parameter is empty", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;  ");
  t.assert.strictEqual(mediaType, undefined);
});

// parameters is not parameters
test("semicolon does not exist", (t: TestContext) => {
  const mediaType = parseMediaType("text/html    xxx");
  t.assert.strictEqual(mediaType, undefined);
});

test("parameter-name does not exist", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;  =yyy");
  t.assert.strictEqual(mediaType, undefined);
});

test("parameter-name does not exist2", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;  =yyy xxx=zzz");
  t.assert.strictEqual(mediaType, undefined);
});

test("parameter-name does not exist3", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;  xxx=yyy =zzz");
  t.assert.strictEqual(mediaType, undefined);
});

describe("parameter-value does not exist", () => {
  const mediaType = parseMediaType("text/html  ;  xxx=");
  test("a", (t: TestContext) => {
    t.assert.strictEqual(mediaType, undefined);
  });
  test("b", (t: TestContext) => {
    t.assert.strictEqual(mediaType, undefined);
  });
});

test("parameter-value does not exist2", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;  xxx= yyy=zzz");
  t.assert.strictEqual(mediaType, undefined);
});

test("parameter-value does not exist3", (t: TestContext) => {
  const mediaType = parseMediaType("text/html;xxx=; yyy=zzz");
  t.assert.strictEqual(mediaType, undefined);
});

test("parameter-value does not exist4", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;xxx=yyy; zzz=");
  t.assert.strictEqual(mediaType, undefined);
});

test("parameter '=' does not exist5", (t: TestContext) => {
  const mediaType = parseMediaType("text/html  ;xxx yyy");
  t.assert.strictEqual(mediaType, undefined);
});

test("type contains duplication", (t: TestContext) => {
  const testContentType = "application/json; charset=utf-8; charset=utf-32";
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType?.parameters["charset"], "utf-8");
});

test("type contains @", (t: TestContext) => {
  const testContentType = "application/yaml; charset=utf-8;   q=0.9;  xxx=p";
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType?.parameters["charset"], "utf-8");
});

test("charset backslash", (t: TestContext) => {
  const testContentType = 'application/json; charset="utf\\\\-8"';
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType!.parameters["charset"], "utf\\-8");
});

test("charset double quote empty", (t: TestContext) => {
  const testContentType = 'application/json; charset=""';
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType?.parameters["charset"], "");
});

test("charseta", (t: TestContext) => {
  const testContentType = 'application/json; charset=aa"bs';
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType, undefined);
});

test("now allow spaces", (t: TestContext) => {
  const testContentType = "application/json; charset =aa";
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType, undefined);
});

test("now allow spaces2", (t: TestContext) => {
  const testContentType = "application/json; charset= aa";
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType, undefined);
});

test("now allow spaces2 but in quotes ok", (t: TestContext) => {
  const testContentType = 'application/json; charset=" aa"';
  const mediaType = parseMediaType(testContentType);
  t.assert.strictEqual(mediaType!.parameters["charset"], " aa");
});
