import assert from "assert";
import { ACCEPT_KEY, GQL_RESPONSE_MEDIA_TYPE } from "./constant.js";
import { parseMediaRange, includeMediaType } from "./media-type.js";
import {
  GqlRequestErrorResponseWithHttpStatus,
  Result,
  GqlRequest,
  makeFailure,
  makeSuccess,
} from "./type.js";
import { buildSimpleGqlRequestErrorResponse } from "./util.js";

export const validateGetRequestHeaders = (
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
): Result<GqlRequest, GqlRequestErrorResponseWithHttpStatus> => {
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
): Result<GqlRequest, GqlRequestErrorResponseWithHttpStatus> => {
  assert(httpRequest.method === "GET");

  const headerValidationResult = validateGetRequestHeaders(httpRequest.headers);
  if (headerValidationResult !== null) {
    // @spec: S86, S87, S88, S117
    return makeFailure(buildSimpleGqlRequestErrorResponse());
  }
  return buildGqlRequestFromUrl(httpRequest.url);
};
