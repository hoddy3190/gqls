import { assert } from "node:console";
import {
  ACCEPT_KEY,
  CONTENT_TYPE_KEY,
  DEFAULT_ENCODING,
  DEFAULT_ERROR_STATUS_CODE,
  getStatusText,
  GQL_RESPONSE_CONTENT_TYPE,
  GQL_RESPONSE_MEDIA_TYPE,
} from "./constant.js";
import {
  includeMediaType,
  parseMediaRange,
  parseMediaType,
} from "./media-type.js";
import {
  GqlImpl,
  GqlRequestErrorResponseAndHttpStatus,
  GqlResponseAndHttpStatus,
  GqlRequest,
  GqlResponse,
  isGqlSuccessOrPartialSuccess,
  MaybeGqlRequestError,
  isGqlRequestErrorResponseAndHttpStatus,
  StatusCode,
} from "./type.js";

const GET_REQ_MEDIA_TYPE = "application/x-www-form-urlencoded";
const POST_REQ_MEDIA_TYPE = "application/json";

const buildSimpleGqlRequestErrorResponse = (
  statusCode: StatusCode = DEFAULT_ERROR_STATUS_CODE
): GqlRequestErrorResponseAndHttpStatus => {
  return {
    httpResult: { statusCode, message: null },
    gqlResponse: {
      errors: [
        {
          message: getStatusText(statusCode),
          locations: [],
        },
      ],
      extensions: {},
    },
  };
};

const isStringRecord = (o: unknown): o is Record<string, unknown> => {
  return !!o && typeof o === "object" && !Buffer.isBuffer(o) && !Array.isArray(o);
};

const isNonEmptyStringRecord = (o: unknown): o is Record<string, unknown> => {
  return isStringRecord(o) && Object.keys(o).length > 0;
};

const isGqlRequest = (data: unknown): data is GqlRequest => {
  if (!isStringRecord(data)) return false;

  const len = Object.keys(data).length;
  // Since the key "query" is required, the length must be at least 1.
  // The keys "operationName", "variables", and "extensions" are optional, so the length can be up to 4.
  if (!(len >= 1 && len <= 4)) return false;

  let keyCount = 0;

  // @spec: S25, S32, S62
  if (!("query" in data)) return false;
  keyCount++;
  // @spec: S25, S32, S34, S62
  if (typeof data["query"] !== "string") return false;

  // @spec: S26, S63
  if ("operationName" in data) {
    keyCount++;
    // @spec: S32
    if (typeof data["operationName"] !== "string") return false;
  }

  // @spec: S27, S64
  if ("variables" in data) {
    keyCount++;
    // @spec: S32
    if (!isStringRecord(data["variables"])) return false;
  }

  // @spec: S28, S65
  if ("extensions" in data) {
    keyCount++;
    // @spec: S32
    if (!isStringRecord(data["extensions"])) return false;
  }

  // @spec: S66
  // Other keys are not allowed.
  if (keyCount !== len) return false;

  return true;
};

export const validatePostRequestHeaders = (
  headers: Request["headers"]
): GqlRequestErrorResponseAndHttpStatus | null => {
  // @spec: S35, S36, S79
  // While S79 states that a request without an Accept header SHOULD be treated
  // as if it included `Accept: application/graphql-response+json`,
  // S36 indicates that the server MAY respond with an error to such a request.
  // For simplicity, this library treats such requests as errors.
  const clientAcceptableMediaType = headers.get(ACCEPT_KEY);
  if (!clientAcceptableMediaType) {
    // S5: 4xx or 5xx status code
    return buildSimpleGqlRequestErrorResponse();
  }

  // @spec: S37
  // S37 implies that if a client supplies an Accept header,
  // requests with an unparsable Accept header are not allowed.
  const mediaRange = parseMediaRange(clientAcceptableMediaType);
  if (!mediaRange) {
    // @spec: S86, S87, S88
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S16, S37, S38, S39, S76, S77, S78
  // Due to S39, `application/json` is no longer required after the watershed,
  // so this library does not check whether the Accept header includes `application/json`.
  // TODO: S75
  // This library doesn't know what to do in the case that the Accept header contains application/json but does not contain application/graphql-response+json.
  if (!includeMediaType(mediaRange, GQL_RESPONSE_MEDIA_TYPE)) {
    // @spec: S73, S74
    return buildSimpleGqlRequestErrorResponse(406);
  }

  const contentType = headers.get(CONTENT_TYPE_KEY);
  // @spec: S53, S56, S57
  // This library does not utilize the option to assume the media type as stated in S57.
  if (contentType === null) {
    return buildSimpleGqlRequestErrorResponse();
  }
  const parsedContentType = parseMediaType(contentType);
  // @spec: S53
  if (parsedContentType === undefined) {
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S17, S19, S54, S60
  if (parsedContentType.mediaType !== POST_REQ_MEDIA_TYPE) {
    return buildSimpleGqlRequestErrorResponse();
  }
  const charset = parsedContentType.parameters["charset"];
  // @spec: S54, S58
  // Although S58 states that servers MAY support media types other than "UTF-8",
  // this library does not support them.
  if (charset !== undefined && charset !== DEFAULT_ENCODING) {
    return buildSimpleGqlRequestErrorResponse();
  }

  return null;
};

export const buildGqlRequestFromPost = async (
  httpRequest: Request
): Promise<MaybeGqlRequestError<GqlRequest>> => {
  assert(httpRequest.method === "POST");

  const validationResult = validatePostRequestHeaders(httpRequest.headers);
  if (validationResult !== null) {
    return validationResult;
  }

  // @spec: S52
  let body: unknown;
  try {
    body = await httpRequest.json();
  } catch (e) {
    return buildSimpleGqlRequestErrorResponse();
  }

  if (!isGqlRequest(body)) {
    return buildSimpleGqlRequestErrorResponse();
  }
  return { data: body };
};

export const validateGetRequestHeaders = (
  headers: Request["headers"]
): GqlRequestErrorResponseAndHttpStatus | null => {
  // @spec: S35, S36, S79
  // While S79 states that a request without an Accept header SHOULD be treated
  // as if it included `Accept: application/graphql-response+json`,
  // S36 indicates that the server MAY respond with an error to such a request.
  // For simplicity, this library treats such requests as errors.
  const clientAcceptableMediaType = headers.get(ACCEPT_KEY);
  if (!clientAcceptableMediaType) {
    // S5: 4xx or 5xx status code
    return buildSimpleGqlRequestErrorResponse();
  }

  // @spec: S37
  // S37 implies that if a client supplies an Accept header,
  // requests with an unparsable Accept header are not allowed.
  const acceptableMediaRange = parseMediaRange(clientAcceptableMediaType);
  if (!acceptableMediaRange) {
    // @spec: S86, S87, S88
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S16, S37, S38, S39, S76, S77, S78
  // Due to S39, `application/json` is no longer required after the watershed,
  // so this library does not check whether the Accept header includes `application/json`.
  // TODO: S75
  // This library doesn't know what to do in the case that the Accept header contains application/json but does not contain application/graphql-response+json.
  if (!includeMediaType(acceptableMediaRange, GQL_RESPONSE_MEDIA_TYPE)) {
    // @spec: S73, S74
    return buildSimpleGqlRequestErrorResponse(406);
  }

  return null;
};

export const buildGqlRequestFromGet = (
  httpRequest: Request
): MaybeGqlRequestError<GqlRequest> => {
  assert(httpRequest.method === "GET");

  const validationResult = validateGetRequestHeaders(httpRequest.headers);
  if (validationResult !== null) {
    return buildSimpleGqlRequestErrorResponse();
  }

  // @spec: S42
  // URL class is implemented by WHATWG URL Standard.
  // https://nodejs.org/api/url.html#the-whatwg-url-api
  if (!URL.canParse(httpRequest.url)) {
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S47
  const searchParams = new URL(httpRequest.url).searchParams;

  const query = searchParams.get("query");
  // @spec: S43
  if (query === null) {
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S51
  // The logic for checking if the value of "query" indicates a mutation is based on startsWith("query").
  // As for "operationName", there is no specific handling because of no logic idea.
  if (!query.startsWith("query")) {
    return buildSimpleGqlRequestErrorResponse(405);
  }

  // @spec: S44, S46
  const operationNameStr = searchParams.get("operationName");
  // @spec: S48
  // "operationName is null" is equivalent to omitting the operationName parameter.
  const operationName = operationNameStr !== "" ? operationNameStr : null;

  let variables = {};
  const variablesStr = searchParams.get("variables");
  if (variablesStr) {
    try {
      // @spec: S45
      variables = JSON.parse(variablesStr);
    } catch (e) {
      return buildSimpleGqlRequestErrorResponse();
    }
  }

  let extensions = {};
  const extensionsStr = searchParams.get("extensions");
  if (extensionsStr) {
    try {
      // @spec: S45
      extensions = JSON.parse(extensionsStr);
    } catch (e) {
      return buildSimpleGqlRequestErrorResponse();
    }
  }

  const gqlRequest = { query, operationName, variables, extensions };
  if (!isGqlRequest(gqlRequest)) {
    return buildSimpleGqlRequestErrorResponse();
  }

  return {
    data: gqlRequest,
  };
};

export const buildGqlRequest = async (
  httpRequest: Request
): Promise<MaybeGqlRequestError<GqlRequest>> => {
  if (httpRequest.method === "POST") {
    return await buildGqlRequestFromPost(httpRequest);
  } else if (httpRequest.method === "GET") {
    return buildGqlRequestFromGet(httpRequest);
  }
  // @spec: S23
  // In this library, the only HTTP method other than "POST" is "GET."
  return buildSimpleGqlRequestErrorResponse(405);
};

export const buildGqlOverHttpResult = <T>(
  gqlResponse: GqlResponse<T>
): GqlResponseAndHttpStatus<T> => {
  if (isGqlSuccessOrPartialSuccess(gqlResponse)) {
    return {
      // @spec: S111, S112, S113, S114
      httpResult: { statusCode: 200, message: null },
      gqlResponse,
    };
  }
  return {
    // @spec: S115, S116, S117
    // TODO: 5xx
    httpResult: { statusCode: 400, message: null },
    gqlResponse,
  };
};

export const buildHttpResponse = <T>(
  gqlResponseAndHttpStatus: GqlResponseAndHttpStatus<T>
): Response => {
  const { gqlResponse, httpResult } = gqlResponseAndHttpStatus;
  // @spec: S70
  const response = new Response(JSON.stringify(gqlResponse), {
    status: httpResult.statusCode,
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
): Promise<GqlResponseAndHttpStatus<T>> => {
  const gqlRequest = await buildGqlRequest(httpRequest);
  if (isGqlRequestErrorResponseAndHttpStatus(gqlRequest)) {
    return gqlRequest;
  }
  const gqlResponse = await gqlImpl(gqlRequest.data);
  return buildGqlOverHttpResult(gqlResponse);
};
