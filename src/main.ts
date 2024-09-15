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
  StatusCode,
  Result,
  makeFailure,
  makeSuccess,
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

const convertToGqlRequest = (data: unknown): GqlRequest | null => {
  if (!isStringRecord(data)) return null;

  const len = Object.keys(data).length;
  // Since the key "query" is required, the length must be at least 1.
  // The keys "operationName", "variables", and "extensions" are optional, so the length can be up to 4.
  if (!(len >= 1 && len <= 4)) return null;

  let keyCount = 0;

  // @spec: S25, S32, S62
  if (!("query" in data)) return null;
  keyCount++;
  // @spec: S25, S32, S34, S62
  if (typeof data["query"] !== "string") return null;

  let operationName: GqlRequest["operationName"] = null;
  // @spec: S26, S63
  if ("operationName" in data) {
    keyCount++;
    // @spec: S33
    if (data["operationName"] !== null) {
      // @spec: S32
      if (typeof data["operationName"] !== "string") return null;
      operationName = data["operationName"];
    }
  }

  let variables: GqlRequest["variables"] = {};
  // @spec: S27, S64
  if ("variables" in data) {
    keyCount++;
    // @spec: S33
    if (data["variables"] !== null) {
      // @spec: S32
      if (!isStringRecord(data["variables"])) return null;
      variables = data["variables"];
    }
  }

  let extensions: GqlRequest["extensions"] = {};
  // @spec: S28, S65
  if ("extensions" in data) {
    keyCount++;
    // @spec: S33
    if (data["extensions"] !== null) {
      // @spec: S32
      if (!isStringRecord(data["extensions"])) return null;
      extensions = data["extensions"];
    }
  }

  // @spec: S66
  // Other keys are not allowed.
  if (keyCount !== len) return null;

  return {
    query: data["query"],
    operationName,
    variables,
    extensions,
  };
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
  // @spec: S16, S37, S38, S39, S72, S76, S77, S78
  // Due to S39, `application/json` is no longer required after the watershed,
  // so this library does not check whether the Accept header includes `application/json`.
  // S72 states that the server MUST respect the client's Accept header,
  // but this library does not support media types other than "application/graphql-response+json".
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
): Promise<Result<GqlRequest, GqlRequestErrorResponseAndHttpStatus>> => {
  assert(httpRequest.method === "POST");

  const validationResult = validatePostRequestHeaders(httpRequest.headers);
  if (validationResult !== null) {
    // @spec: S86, S87, S88, S117
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }

  // @spec: S52
  let body: unknown;
  try {
    body = await httpRequest.json();
  } catch (e) {
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }

  const gqlRequest = convertToGqlRequest(body);
  if (gqlRequest === null) {
    // @spec: S86, S87, S88, S117
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }
  return makeSuccess(gqlRequest);
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
  // S72 states that the server MUST respect the client's Accept header,
  // but this library does not support media types other than "application/graphql-response+json".
  // TODO: S75
  // This library doesn't know what to do in the case that the Accept header contains application/json but does not contain application/graphql-response+json.
  if (!includeMediaType(acceptableMediaRange, GQL_RESPONSE_MEDIA_TYPE)) {
    // @spec: S73, S74
    return buildSimpleGqlRequestErrorResponse(406);
  }

  return null;
};

export const buildGqlRequestFromUrl = (
  url: string
): Result<GqlRequest, GqlRequestErrorResponseAndHttpStatus> => {
  // @spec: S42
  // URL class is implemented by WHATWG URL Standard.
  // https://nodejs.org/api/url.html#the-whatwg-url-api
  if (!URL.canParse(url)) {
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }
  // @spec: S47
  const searchParams = new URL(url).searchParams;

  let paramNum = 0;

  const query = searchParams.get("query");
  // @spec: S43
  if (query === null) {
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }
  paramNum++;

  // @spec: S51
  // The logic for checking if the value of "query" indicates a mutation is based on startsWith("query").
  // As for "operationName", there is no specific handling because of no logic idea.
  if (!query.startsWith("query")) {
    return makeFailure(buildSimpleGqlRequestErrorResponse(405));
  }

  // @spec: S44, S46
  const operationNameStr = searchParams.get("operationName");
  if (operationNameStr !== null) {
    paramNum++;
  }
  // @spec: S48
  // "operationName is null" is equivalent to omitting the operationName parameter.
  const operationName = operationNameStr !== "" ? operationNameStr : null;

  let variables = {};
  const variablesStr = searchParams.get("variables");
  if (variablesStr !== null) {
    paramNum++;
    try {
      // @spec: S45
      variables = JSON.parse(variablesStr);
    } catch (e) {
      return makeFailure(buildSimpleGqlRequestErrorResponse());
    }
  }

  let extensions = {};
  const extensionsStr = searchParams.get("extensions");
  if (extensionsStr !== null) {
    paramNum++;
    try {
      // @spec: S45
      extensions = JSON.parse(extensionsStr);
    } catch (e) {
      return makeFailure(buildSimpleGqlRequestErrorResponse());
    }
  }

  if ([...searchParams.keys()].length !== paramNum) {
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }

  return makeSuccess({
    query,
    operationName,
    variables,
    extensions,
  });
};

export const buildGqlRequestFromGet = (
  httpRequest: Request
): Result<GqlRequest, GqlRequestErrorResponseAndHttpStatus> => {
  assert(httpRequest.method === "GET");

  const headerValidationResult = validateGetRequestHeaders(httpRequest.headers);
  if (headerValidationResult !== null) {
    // @spec: S86, S87, S88, S117
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }
  return buildGqlRequestFromUrl(httpRequest.url);
};

export const buildGqlRequest = async (
  httpRequest: Request
): Promise<Result<GqlRequest, GqlRequestErrorResponseAndHttpStatus>> => {
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
  if (!gqlRequest.success) {
    return gqlRequest.error;
  }
  const gqlResponse = await gqlImpl(gqlRequest.data);
  return buildGqlOverHttpResult(gqlResponse);
};
