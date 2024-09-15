import { GQL_RESPONSE_CONTENT_TYPE } from "./constant.js";
import { buildGqlRequestFromGet } from "./get.js";
import { buildGqlRequestFromPost } from "./post.js";
import {
  GqlImpl,
  GqlRequest,
  GqlRequestErrorResponseWithHttpStatus,
  GqlResponse,
  GqlResponseWithHttpStatus,
  isGqlSuccessOrPartialSuccess,
  makeFailure,
  Result,
} from "./type.js";
import { buildSimpleGqlRequestErrorResponse } from "./util.js";

export const buildGqlRequest = async (
  httpRequest: Request
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

export const buildGqlOverHttpResult = <T>(
  gqlResponse: GqlResponse<T>
): GqlResponseWithHttpStatus<T> => {
  if (isGqlSuccessOrPartialSuccess(gqlResponse)) {
    return {
      // @spec: S111, S112, S113, S114
      httpStatus: { statusCode: 200 },
      gqlResponse,
    };
  }
  return {
    // @spec: S115, S116, S117
    // TODO: 5xx
    httpStatus: { statusCode: 400 },
    gqlResponse,
  };
};

export const buildHttpResponse = <T>(
  gqlResponseWithHttpStatus: GqlResponseWithHttpStatus<T>
): Response => {
  const { gqlResponse, httpStatus } = gqlResponseWithHttpStatus;
  // @spec: S70
  const response = new Response(JSON.stringify(gqlResponse), {
    status: httpStatus.statusCode,
    headers: {
      // @spec: S16, S20, S71
      CONTENT_TYPE_KEY: GQL_RESPONSE_CONTENT_TYPE,
    },
  });
  return response;
};

// @spec: S68
// This library returns well-formed GraphQL responses not only for well-formed requests
// but also for requests that are not well-formed.
export const handle = async <T>(
  httpRequest: Request,
  // @spec: S8
  // gqlImpl is typically created using a GraphQL schema and resolvers.
  gqlImpl: GqlImpl<T>
): Promise<GqlResponseWithHttpStatus<T>> => {
  const gqlRequest = await buildGqlRequest(httpRequest);
  if (!gqlRequest.success) {
    return gqlRequest.error;
  }
  const gqlResponse = await gqlImpl(gqlRequest.data);
  return buildGqlOverHttpResult(gqlResponse);
};
