import assert from "node:assert/strict";
import { suite, test } from "node:test";
import {
  buildGqlRequestFromUrl,
  validateGetRequestHeaders,
} from "../src/get.js";

const TEST_EP = "https://example.com:3000/graphql";
const QUERY = `query=query HeroNameAndFriends($episode: Episode) {
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
    exp: null,
  },
  {
    header: {
      AcCepT: "application/graphql-response+json",
    },
    exp: null,
  },
  {
    header: {
      accept: "application/json",
    },
    exp: 406,
  },
  {
    header: {
      accept: "appl ication/json*",
    },
    exp: 400,
  },
  {
    header: {
      accept: "application/graphql-response+json",
      "Content-Type": "application/json",
    },
    exp: null,
  },
];

suite("validateGetRequestHeaders", () => {
  for (const { header, exp } of HEADER_TEST_CASES) {
    const expMsg = exp === null ? "valid" : `status code ${exp}`;
    test(`"Header ${JSON.stringify(header)}" should be ${expMsg}`, () => {
      const act = validateGetRequestHeaders(new Headers(header));
      assert.strictEqual(act === null ? act : act.httpStatus.statusCode, exp);
    });
  }
});

// @spec: S49
test('operationName=null represents an operation with the name "null"', () => {
  const testCaseSearchParam = `?${QUERY}&operationName=null`;
  const url = `${TEST_EP}${encodeURI(testCaseSearchParam)}`;
  const act = buildGqlRequestFromUrl(url);
  if (!act.success) {
    assert.fail("buildGqlRequest failed");
  }
  assert.strictEqual(act.data.operationName, "null");
});

const urlTestCases = [
  {
    searchParam: `?${QUERY}`,
    exp: "success",
  },
  {
    searchParam: ``,
    exp: 400,
  },
  {
    searchParam: `?query=`,
    exp: 405,
  },
  {
    searchParam: `?query=fjiwomlvw`,
    exp: 405,
  },
  {
    searchParam: `?query=query(fjiewn)fwefq]`,
    exp: "success",
  },
  {
    searchParam: `?${MUTATION}`,
    exp: 405,
  },
  {
    searchParam: `?${QUERY}&operationName=`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&operationName=null`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&operationName=""`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&operationName=abc`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&operationName={}`,
    exp: "success",
  },
  {
    // @spec: S45
    // The value of variables is empty string, which cannot be encoded as a JSON string.
    searchParam: `?${QUERY}&variables=`,
    exp: 400,
  },
  {
    searchParam: `?${QUERY}&variables={}`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&variables={"a":1}`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&variables=not-json`,
    exp: 400,
  },
  {
    // @spec: S45
    // The value of extensions is empty string, which cannot be encoded as a JSON string.
    searchParam: `?${QUERY}&extensions=`,
    exp: 400,
  },
  {
    searchParam: `?${QUERY}&extensions={}`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&extensions={"a":1}`,
    exp: "success",
  },
  {
    searchParam: `?${QUERY}&extensions=not-json`,
    exp: 400,
  },
  {
    searchParam: `?${QUERY}&other={}`,
    exp: 400,
  },
];

suite("buildGqlRequestFromUrl", () => {
  for (const { searchParam, exp } of urlTestCases) {
    // @spec: S47
    // parameters are URL-encoded values
    const encodedTestCaseUrl = `${TEST_EP}${encodeURI(searchParam)}`;
    const expMsg = typeof exp === "number" ? `status code ${exp}` : exp;

    test(`"${searchParam}" should be ${expMsg}`, () => {
      const result = buildGqlRequestFromUrl(encodedTestCaseUrl);
      const act = result.success
        ? "success"
        : result.error.httpStatus.statusCode;
      assert.strictEqual(act, exp);
    });
  }
});
