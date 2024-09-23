import assert from "node:assert/strict";
import { describe, suite, test } from "node:test";
import {
  buildGqlRequestFromBody,
  buildGqlRequestFromPost,
  validatePostRequestHeaders,
} from "../src/post.js";

const QUERY = `query HeroNameAndFriends($episode: Episode) {
  hero(episode: $episode) {
    name
    friends {
      name
    }
  }
}`;

const MUTATION = `query=mutation CreateReviewForEpisode($ep: Episode!, $review: ReviewInput!) {
  createReview(episode: $ep, review: $review) {
    stars
    commentary
  }
}`;

const HEADER_TEST_CASES = [
  {
    header: {},
    exp: 400,
  },
  {
    header: {
      accept: "application/graphql-response+json",
    },
    exp: 400,
  },
  {
    // @spec: S67
    header: {
      accept: "application/graphql-response+json",
      "Content-Type": "application/json",
    },
    exp: null,
  },
  {
    header: {
      accept: "application/graphql-response+json",
      "Content-Type": "text/plain",
    },
    exp: 400,
  },
  {
    header: {
      "Content-Type": "application/json",
    },
    exp: 400,
  },
  {
    header: {
      accept: "application/json",
      "Content-Type": "application/json",
    },
    exp: 406,
  },
  // TODO: accept と content-type 両方異常であれば、どちらのステータスコードを返す？
  // {
  //   header: {
  //     accept: "application/json",
  //     "Content-Type": "application/json; charset=utf-32",
  //   },
  //   exp: 400,
  // },
  {
    header: {
      accept: "application/graphql-response+json",
      "Content-Type": "application/json; charset=utf-32",
    },
    exp: 400,
  },
];

suite("validatePostRequestHeaders", () => {
  for (const { header, exp } of HEADER_TEST_CASES) {
    const expMsg = exp === null ? "valid" : `status code ${exp}`;
    test(`"Header ${JSON.stringify(header)}" should be ${expMsg}`, () => {
      const act = validatePostRequestHeaders(new Headers(header));
      assert.strictEqual(act === null ? act : act.httpStatus.statusCode, exp);
    });
  }
});

suite("buildGqlRequestFromBody", () => {
  const urlTestCases = [
    {
      // @spec: S67
      body: {
        query: "query ($id: ID!) {\n  user(id: $id) {\n    name\n  }\n}",
        variables: { id: "QVBJcy5ndXJ1" },
      },
      exp: "success",
    },
    {
      // @spec: S121
      body: {
        qeury: "{__typename}",
      },
      exp: 400,
    },
    {
      // @spec: S121
      body: {
        query: "query Q ($i:Int!) { q(i: $i) }",
        variables: [7],
      },
      exp: 400,
    },
    {
      // @spec: S122
      body: {
        query: "{",
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
        operationName: null,
      },
      exp: "success",
    },
    {
      body: {
        query: MUTATION,
        operationName: "",
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
        operationName: "updateProfile",
      },
      exp: "success",
    },
    {
      body: {
        query: MUTATION,
        variables: null,
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
        variables: "",
      },
      exp: 400,
    },
    {
      body: {
        query: MUTATION,
        variables: {},
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
        variables: { a: 1 },
      },
      exp: "success",
    },
    {
      body: {
        query: MUTATION,
        extensions: null,
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
        extensions: "",
      },
      exp: 400,
    },
    {
      body: {
        query: MUTATION,
        extensions: {},
      },
      exp: "success",
    },
    {
      body: {
        query: QUERY,
        extensions: { a: null },
      },
      exp: "success",
    },
    {
      body: {
        extensions: {},
      },
      exp: 400,
    },
    {
      body: {
        query: MUTATION,
        another: {},
      },
      exp: 400,
    },
  ];

  for (const { body, exp } of urlTestCases) {
    const expMsg = typeof exp === "number" ? `status code ${exp}` : exp;

    test(`"${JSON.stringify(body)}" should be ${expMsg}`, () => {
      const result = buildGqlRequestFromBody(body);
      const act = result.success
        ? "success"
        : result.error.httpStatus.statusCode;
      assert.strictEqual(act, exp);
    });
  }
});

describe("buildGqlRequestFromPost", async () => {
  test("well-formed request should be success", async () => {
    const request = new Request("http://example.com/graphql", {
      method: "POST",
      headers: {
        accept: "application/graphql-response+json",
        "Content-Type": "application/json",
      },
      body: '{"query": "query hello {}"}',
    });
    const act = await buildGqlRequestFromPost(request);
    assert.strictEqual(act.success, true);
  });

  // @spec: S120
  test("The request without body should be status code 400", async () => {
    const request = new Request("http://example.com/graphql", {
      method: "POST",
      headers: {
        accept: "application/graphql-response+json",
        "Content-Type": "application/json",
      },
    });
    const act = await buildGqlRequestFromPost(request);
    assert.strictEqual(act.success, false);
    assert.strictEqual(act.error.httpStatus.statusCode, 400);
  });

  // @spec: S120
  test("The request whose body is invalid JSON should be status code 400", async () => {
    const request = new Request("http://example.com/graphql", {
      method: "POST",
      headers: {
        accept: "application/graphql-response+json",
        "Content-Type": "application/json",
      },
      body: '{"query"',
    });
    const act = await buildGqlRequestFromPost(request);
    assert.strictEqual(act.success, false);
    assert.strictEqual(act.error.httpStatus.statusCode, 400);
  });
});
