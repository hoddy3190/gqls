import assert from "node:assert/strict";
import test from "node:test";

/**
 *  This test file is not for this library but for the URL class that this library depends on.
 *  It is used to understand the specifications of the URL class. For more details,
 *  see Node.js URL documentation https://nodejs.org/api/url.html.
 */

test('"?extensions=" should be interpreted as extensions being an empty string', () => {
  const url = "http://example.com:3000/graphql?extensions=";
  const searchParam = URL.parse(url)?.searchParams;
  const extensions = searchParam!.get("extensions");
  assert.strictEqual(extensions, "");
});
