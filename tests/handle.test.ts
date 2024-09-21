import { describe, it, mock } from "node:test";
import { handle } from "../src/main.js";
import assert from "node:assert/strict";
import { GqlRequest } from "../src/type.js";

const buildWellFormedRequest = () => {
  return new Request("http://example.com/graphql", {
    method: "POST",
    headers: {
      accept: "application/graphql-response+json",
      "Content-Type": "application/json",
    },
    body: '{"query": "query hello {}"}',
  });
};

describe("handle", () => {
  describe("GraphQL execution success", () => {
    it("should be status code 200", async () => {
      const wellFormedRequest = buildWellFormedRequest();
      const gqlImpl = mock.fn(async (_gqlRequest: GqlRequest) => {
        return { data: 1, extensions: {} };
      });
      const act = await handle(wellFormedRequest, gqlImpl);
      assert.strictEqual(gqlImpl.mock.callCount(), 1);
      assert.strictEqual(act.status, 200);
      mock.reset();
    });
  });

  describe("GraphQL field error", () => {
    it("should be status code 200", async () => {
      const wellFormedRequest = buildWellFormedRequest();
      const gqlImpl = mock.fn(async (_gqlRequest: GqlRequest) => {
        return { data: 1, errors: { message: "error" }, extensions: {} };
      });
      const act = await handle(wellFormedRequest, gqlImpl);
      assert.strictEqual(gqlImpl.mock.callCount(), 1);
      assert.strictEqual(act.status, 200);
      mock.reset();
    });
  });

  // @spec: S123, S124, S125
  describe("GraphQL request error", () => {
    it("should be status code 400", async () => {
      const wellFormedRequest = buildWellFormedRequest();
      const gqlImpl = mock.fn(async (_gqlRequest: GqlRequest) => {
        return { errors: [{ message: "error" }], extensions: {} };
      });
      const act = await handle(wellFormedRequest, gqlImpl);
      assert.strictEqual(gqlImpl.mock.callCount(), 1);
      assert.strictEqual(act.status, 400);
      mock.reset();
    });
  });
});
