import assert from "assert";
import {
  ACCEPT_KEY,
  GQL_RESPONSE_MEDIA_TYPE,
  CONTENT_TYPE_KEY,
  DEFAULT_ENCODING,
  POST_REQ_MEDIA_TYPE,
} from "./constant.js";
import {
  parseMediaRange,
  includeMediaType,
  parseMediaType,
} from "./media-type.js";
import {
  Result,
  GqlRequest,
  GqlRequestErrorResponseWithHttpStatus,
  makeFailure,
  makeSuccess,
} from "./type.js";
import { buildSimpleGqlRequestErrorResponse } from "./util.js";

const isStringRecord = (o: unknown): o is Record<string, unknown> => {
  return !!o && typeof o === "object" && !Buffer.isBuffer(o) && !Array.isArray(o);
};

export const buildGqlRequestFromBody = (
  body: unknown
): Result<GqlRequest, GqlRequestErrorResponseWithHttpStatus> => {
  if (!isStringRecord(body))
    return makeFailure(buildSimpleGqlRequestErrorResponse());

  const len = Object.keys(body).length;
  // Since the key "query" is required, the length must be at least 1.
  // The keys "operationName", "variables", and "extensions" are optional, so the length can be up to 4.
  if (!(len >= 1 && len <= 4))
    return makeFailure(buildSimpleGqlRequestErrorResponse());

  let keyCount = 0;

  // @spec: S25, S32, S62
  if (!("query" in body)) return makeFailure(buildSimpleGqlRequestErrorResponse());
  keyCount++;
  // @spec: S25, S32, S34, S62
  if (typeof body["query"] !== "string")
    return makeFailure(buildSimpleGqlRequestErrorResponse());

  let operationName: GqlRequest["operationName"] = null;
  // @spec: S26, S63
  if ("operationName" in body) {
    keyCount++;
    // @spec: S33
    if (body["operationName"] !== null) {
      // @spec: S32
      if (typeof body["operationName"] !== "string")
        return makeFailure(buildSimpleGqlRequestErrorResponse());
      operationName = body["operationName"];
    }
  }

  let variables: GqlRequest["variables"] = {};
  // @spec: S27, S64
  if ("variables" in body) {
    keyCount++;
    // @spec: S33
    if (body["variables"] !== null) {
      // @spec: S32
      if (!isStringRecord(body["variables"]))
        return makeFailure(buildSimpleGqlRequestErrorResponse());
      variables = body["variables"];
    }
  }

  let extensions: GqlRequest["extensions"] = {};
  // @spec: S28, S65
  if ("extensions" in body) {
    keyCount++;
    // @spec: S33
    if (body["extensions"] !== null) {
      // @spec: S32
      if (!isStringRecord(body["extensions"]))
        return makeFailure(buildSimpleGqlRequestErrorResponse());
      extensions = body["extensions"];
    }
  }

  // @spec: S66
  // Other keys are not allowed.
  if (keyCount !== len) return makeFailure(buildSimpleGqlRequestErrorResponse());

  return makeSuccess({
    query: body["query"],
    operationName,
    variables,
    extensions,
  });
};

export const validatePostRequestHeaders = (
  headers: Request["headers"]
): GqlRequestErrorResponseWithHttpStatus | null => {
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
): Promise<Result<GqlRequest, GqlRequestErrorResponseWithHttpStatus>> => {
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

  const gqlRequest = buildGqlRequestFromBody(body);
  if (!gqlRequest.success) {
    // @spec: S86, S87, S88, S117
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }
  return makeSuccess(gqlRequest.data);
};
