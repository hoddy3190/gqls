import { GQL_RESPONSE_CONTENT_TYPE } from "./constant.js";
import { buildGqlRequestFromGet } from "./get.js";
import { buildGqlRequestFromPost } from "./post.js";
import {
  GqlImpl,
  GqlRequest,
  GqlRequestErrorResponseWithHttpStatus,
  GqlResponse,
  isGqlSuccessOrPartialSuccess,
  makeFailure,
  Result,
} from "./type.js";
import { buildSimpleGqlRequestErrorResponse } from "./util.js";

export const buildGqlRequest = async (
  httpRequest: Request,
): Promise<Result<GqlRequest, GqlRequestErrorResponseWithHttpStatus>> => {
  if (httpRequest.method === "POST") {
    return await buildGqlRequestFromPost(httpRequest);
  } else if (httpRequest.method === "GET") {
    return buildGqlRequestFromGet(httpRequest);
  }
  // @spec: S23
  // In this library, the only HTTP method other than "POST" is "GET."
  return makeFailure(buildSimpleGqlRequestErrorResponse(405));
};

export const decideStatusCode = <T>(gqlResponse: GqlResponse<T>): number => {
  return isGqlSuccessOrPartialSuccess(gqlResponse)
    ? // @spec: S111, S112, S113, S114, S126, S127
      200
    : // @spec: S115, S116, S117
      400;
};

export const buildHttpResponse = <T>(gqlResponse: GqlResponse<T>): Response => {
  // @spec: S70
  return new Response(JSON.stringify(gqlResponse), {
    status: decideStatusCode(gqlResponse),
    headers: {
      // @spec: S16, S20, S71
      CONTENT_TYPE_KEY: GQL_RESPONSE_CONTENT_TYPE,
    },
  });
};

// @spec: S68
// This library returns well-formed GraphQL responses not only for well-formed requests
// but also for requests that are not well-formed.
export const handle = async <T>(
  httpRequest: Request,
  // @spec: S8
  // gqlImpl is typically created using a GraphQL schema and resolvers.
  gqlImpl: GqlImpl<T>,
): Promise<Response> => {
  const gqlRequest = await buildGqlRequest(httpRequest);
  if (!gqlRequest.success) {
    return buildHttpResponse(gqlRequest.error.gqlResponse);
  }
  const gqlResponse = await gqlImpl(gqlRequest.data);
  return buildHttpResponse(gqlResponse);
};
