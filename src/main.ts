import { assert } from "node:console";
import {
  ACCEPT_KEY,
  CONTENT_TYPE_KEY,
  DEFAULT_ERROR_STATUS_CODE,
  getStatusText,
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

// const RECOGNIZED_MEDIA_TYPE = {
//     // S14
//     REQ: new Set<MIME_TYPE.Typ>({
//         MIME_TYPE.JSON,
//     }),
//     // S15, S16
//     RES:  new Set<MIME_TYPE.Typ>({
//         MIME_TYPE.JSON,
//         MIME_TYPE.GRAPHQL_RES,
//     }),
// };

// S19
type ServerAcceptableMethods =
  | "POST" // MUST
  | "GET"; // MAY

const SERVER_MUST_SUPPORT_MIME_TYPES = new Set([
  // S80, S11, S14
  "application/json",
  // S81
  "application/graphql-response+json",
]);

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
  // The key "query" is required, and the keys "operationName", "variables", and "extensions" are optional.
  // At most these 4 keys are allowed.
  if (len < 1 || len > 4) return false;

  let keyCount = 0;

  // @spec: S21, S65
  if (!("query" in data) || typeof data["query"] !== "string") return false;
  keyCount++;

  // @spec: S22, S66
  if ("operationName" in data) {
    if (typeof data["operationName"] !== "string") return false;
    keyCount++;
  }

  // @spec: S23, S67
  if ("variables" in data) {
    if (!isStringRecord(data["variables"])) return false;
    keyCount++;
  }

  // @spec: S24, S68
  if ("extensions" in data) {
    if (!isStringRecord(data["extensions"])) return false;
    keyCount++;
  }

  // @spec: S69
  if (keyCount !== len) return false;

  return true;
};

export const validatePostRequestHeaders = (
  headers: Request["headers"]
): GqlRequestErrorResponseAndHttpStatus | null => {
  // @spec: S26, S88, S25
  // S88 mentions that a request that doesn't contain Accept header should be treated as if it had Accept: application/graphql-response+json,
  // but S26 says the server may respond with an error against such a request.
  // In this implementation, we treat such a request as an error because of simplicity.
  const clientAcceptableMediaType = headers.get(ACCEPT_KEY);
  if (!clientAcceptableMediaType) {
    // S5: 4xx or 5xx status code
    return buildSimpleGqlRequestErrorResponse();
  }

  // S36, S37
  // S35を上書き
  const mediaRange = parseMediaRange(clientAcceptableMediaType);
  if (!mediaRange) {
    // S5, S95, S97, S98
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S35, S36, S37, S76, S78, S79, S81, S86
  // We don't check whether the Accept header contains application/json because of S37.
  // application/json is no longer required after the watershed.
  // We support application/graphql-response+json only. <-> TODO: 矛盾 S80
  if (!includeMediaType(mediaRange, GQL_RESPONSE_MEDIA_TYPE)) {
    // @spec: S5, S95, S97, S98, S77
    return buildSimpleGqlRequestErrorResponse(406);
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

  let body: unknown;
  try {
    body = await httpRequest.json();
  } catch (e) {
    return buildSimpleGqlRequestErrorResponse(400);
  }

  // TODO: need null check?
  if (typeof body !== "object") {
    return buildSimpleGqlRequestErrorResponse(400);
  }

  if (!isGqlRequest(body)) {
    return buildSimpleGqlRequestErrorResponse(400);
  }
  return { data: body };
};

export const validateGetRequestHeaders = (
  headers: Request["headers"]
): GqlRequestErrorResponseAndHttpStatus | null => {
  const clientAcceptableMediaType = headers.get(ACCEPT_KEY);
  // @spec: S26, S88, S25
  // S88 mentions that a request that doesn't contain Accept header should be treated as if it had Accept: application/graphql-response+json,
  // but S26 says the server may respond with an error against such a request.
  // In this implementation, we treat such a request as an error because of simplicity.
  if (!clientAcceptableMediaType) {
    // S5: 4xx or 5xx status code
    return buildSimpleGqlRequestErrorResponse();
  }

  // S36, S37
  // S35を上書き
  const mediaRange = parseMediaRange(clientAcceptableMediaType);
  if (!mediaRange) {
    // S5, S95, S97, S98
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S35, S36, S37, S76, S78, S79, S81, S86
  // We don't check whether the Accept header contains application/json because of S37.
  // application/json is no longer required after the watershed.
  // We support application/graphql-response+json only. <-> TODO: 矛盾 S80
  if (!includeMediaType(mediaRange, GQL_RESPONSE_MEDIA_TYPE)) {
    // @spec: S5, S95, S97, S98, S77
    return buildSimpleGqlRequestErrorResponse(406);
  }

  const contentType = headers.get(CONTENT_TYPE_KEY);
  if (!contentType) {
    // S5, S95, S97, S98
    return buildSimpleGqlRequestErrorResponse();
  }
  const parsedContentType = parseMediaType(contentType);
  if (parsedContentType === undefined) {
    // S5, S95, S97, S98
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S40
  // It is not explicitly written that the Content-Type header is required for GET requests or Content-Type header should be "application/x-www-form-urlencoded".
  // We interpret that S40 says the Content-Type header is required and should be "application/x-www-form-urlencoded".
  if (parsedContentType.mediaType !== GET_REQ_MEDIA_TYPE) {
    // @spec: S5, S95, S97, S98
    return buildSimpleGqlRequestErrorResponse();
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

  if (!URL.canParse(httpRequest.url)) {
    // S5, S95, S97, S98
    return buildSimpleGqlRequestErrorResponse();
  }
  // @spec: S45
  const searchParams = new URL(httpRequest.url).searchParams;

  const query = searchParams.get("query");
  // @spec: S21
  if (query === null) {
    // @spec: S5, S95, S97, S98, S115, S109
    // S115 examples POST requests, but as the interpretation of S115, it is also applicable to GET requests.
    return buildSimpleGqlRequestErrorResponse();
  }

  // @spec: S41, S50, S51, S52
  // S41: "query" is string type (not null type) because it passes null check.
  //      "startWith" method also checks if the query value is empty or not.
  // TODO: Queryは許可する？
  if (!query.startsWith("query")) {
    return buildSimpleGqlRequestErrorResponse(405);
  }

  // @spec: S22, S42, S44, S46
  // If the operationName parameter is present, it is string. If not, it is null.
  // S44 doesn't affect the implementation.
  // If searchParams.get("operationName") is an empty string, null assigns operationNameParam because of S46.
  const operationNameStr = searchParams.get("operationName");
  const operationName = operationNameStr !== "" ? operationNameStr : null;

  // @spec: S23, S43
  let variables = {};
  const variablesStr = searchParams.get("variables");
  // TODO: permit empty string?
  if (variablesStr) {
    try {
      variables = JSON.parse(variablesStr);
    } catch (e) {
      // @spec: S5, S95, S97, S98, S43, S109
      return buildSimpleGqlRequestErrorResponse();
    }
  }

  // @spec: S24, S43
  let extensions = {};
  const extensionsStr = searchParams.get("extensions");
  // TODO: permit empty string?
  if (extensionsStr) {
    try {
      extensions = JSON.parse(extensionsStr);
    } catch (e) {
      // @spec: S5, S95, S97, S98, S43, S109
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
  return buildSimpleGqlRequestErrorResponse(405);
};

// export const getDocument = (req: Request): Result<GqlRequest> => {
//     const GqlRequest = buildGqlRequest(req);
//     if (isGqlRequestError(GqlRequest)) {
//         return GqlRequest;
//     }

//     let document;
//     try {
//         document = parse(GqlRequest.data.query);
//     } catch (e) {
//         return { errors: [] };
//     }

//     const validationErrors = validate(schema, document, specifiedRules);
//     if (validationErrors.length > 0) {
//         // @spec: S94, S109, S117
//         // TODO: cache
//         return { errors: [] };
//     }

//     return { data: {
//         ...GqlRequest,
//         document
//     }}
// }

// export const getDocument = (document: string): MaybeGqlRequestError<{document: string}> => {
//     let document;
//     try {
//         document = parse(wellFormedReq.query);
//     } catch (e) {
//         return { errors: [] };
//     }

//     const validationErrors = validate(schema, document, specifiedRules);
//     if (validationErrors.length > 0) {
//         // @spec: S94, S109, S117
//     }
//     return document;
// }

// export const validate = (schema, document, specifiedRules): GqlRequestError | null => {
//     const validationErrors = validate(schema, document, specifiedRules);
//     if (validationErrors.length > 0) {
//         // @spec: S94, S109, S117
//     }
//     return null;
// }

/*


// バリデーションからレスポンスまで
export const processGql = (req: Request): GqlOverHttpResult<string> => {
    const GqlRequestResult = buildGqlRequest(req);
    if (isGqlRequestError(GqlRequestResult)) {
        return GqlRequestResult;
    }

    const documentResult = getDocument(GqlRequestResult.data.query);
    if (isRequestError(documentResult)) {
        return documentResult;
    }

    const validationResult = validate(schema, documentResult.data, {});
    if (validationResult !== null) {
        return validationResult;
    }

    const executeResult = execute({
        schema,
        document,
        rootValue,
        contextValue,
        variableValues,
        operationName,
        fieldResolver,
        typeResolver,
    });
    if (isGqlFieldError(executeResult)) {
        return executeResult;
    }

    return {
        data: executeResult,
        extensions: {}
    }
}

export const convertGqlResultToResponse = (result: GqlOverHttpResult<string>): Response => {
    return new Response(result.gqlResult, {status: result.httpStatusCode});
}

export const handle = (req: Request): Response => {
    const result = processGql(req) as GqlOverHttpResult<string>;
    return convertGqlResultToResponse(result);
}

// what is "well-formed GraphQL-over-HTTP request"?

export const handle = (req: Request): Response => {
    const clientAcceptableMimeType = req.headers.get(HEADER_KEY.ACCEPT);
    // @spec: S26, S88, S25
    // S88 mentions that a request that doesn't contain Accept header should be treated as if it had Accept: application/graphql-response+json,
    // but S26 says the server may respond with an error against such a request.
    // In this implementation, we treat such a request as an error because of simplicity.
    if (!clientAcceptableMimeType) {
        // S5: 4xx or 5xx status code
        return buildSimpleGqlRequestErrorResponse();
    }

    // S36, S37
    // S35を上書き
    const mediaRange = parseMediaRange(clientAcceptableMimeType);
    if (!mediaRange) {
        // S5, S95, S97, S98
        return buildSimpleGqlRequestErrorResponse();
    }
    // @spec: S35, S36, S37, S76, S78, S79, S81, S86
    // We don't check whether the Accept header contains application/json because of S37.
    // application/json is no longer required after the watershed.
    // We support application/graphql-response+json only. <-> TODO: 矛盾 S80
    if (!includeMediaType(mediaRange, RES_MEDIA_TYPE)) {
        // @spec: S5, S95, S97, S98, S77
        return makeErrorResponse(406);
    };



    if (!URL.canParse(req.url)) {
        // S5, S95, S97, S98
        return new Response("Bad request", { status: 400 });
    }
    const url = new URL(req.url);


    const contentType = req.headers.get(HEADER_KEY.CONTENT_TYPE);
    if (!contentType) {
        // S5, S95, S97, S98
        return new Response("Bad request", { status: 400 });
    }
    const parsedContentType = parseMediaType(contentType);
    if (parsedContentType === undefined) {
        // S5, S95, S97, S98
        return new Response("Bad request", { status: 400 });
    }

    const method = req.method;
    if (method === "POST") {
        // @spec: S55, S58,
        if (!contentType) {
            // @spec: S5, S95, S97, S98, S59
            return makeErrorResponse(400, "Every POST request must contain Content-Type header whose value is application/json.");
        }

        const parsedContentType = parseMediaType(contentType);
        if (parsedContentType === undefined) {
            // @spec: S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }

        // @spec: S56, S61, S60, S63
        // As of S61, we don't support other media types or encodings
        // As of S60, we don't use the option to assume the media type because of simplicity.
        if (parsedContentType.mediaType != POST_REQ_MEDIA_TYPE) {
            // S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }
        // @spec: S61, S57
        // As of S61, we don't support other encodings than utf-8
        // As of S57, if the request doesn't contain a charset parameter, we accept it as utf-8.
        if (parsedContentType.parameters.has("charset") && parsedContentType.parameters.get("charset") != DEFAULT_ENCODING) {
            return new Response("Bad request", { status: 400 });
        }

        // @spec: S64
        let body;
        try {
            body = await req.json();
            if (typeof body !== "object") {
                // @spec: S5, S95, S97, S98
                return new Response("Bad request", { status: 400 });
            }
        } catch (e) {
            // @spec: S5, S95, S97, S98, S114
            return new Response("Bad request", { status: 400 });
        }

        if (!isGqlRequest(body)) {
            // @spec: S5, S95, S97, S98, S109, S115
            return new Response("Bad request", { status: 400 });
        }

        // TODO: S41 は Apollo Server を参照して実装する
        // if (queryParam.kind != "string") {




    } else if (method === "GET") {
        // @spec: S45
        const searchParams = url.searchParams;

        // @spec: S40
        // It is not written that the Content-Type header is required for GET requests or Content-Type header should be "application/x-www-form-urlencoded".
        // We interpret that S40 says the Content-Type header is required and should be "application/x-www-form-urlencoded".
        if (parsedContentType.mediaType != GET_REQ_MEDIA_TYPE) {
            // @spec: S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }

        const queryParam = searchParams.get("query");
        // @spec: S21
        if (queryParam === null) {
            // @spec: S5, S95, S97, S98, S115, S109
            // S115 examples POST requests, but as the interpretation of S115, it is also applicable to GET requests.
            return makeErrorResponse(400);
        }

        // @spec: S41
        // queryParam is string (not null) type because it passes null check.

        // @spec: S50, S51, S52
        // TODO: Queryは許可する？
        if (!queryParam.startsWith("query")) {
            return makeErrorResponse(405);
        }

        // @spec: S22, S42, S44, S46
        // If the operationName parameter is present, it is string. If not, it is null.
        // S44 doesn't affect the implementation.
        // If searchParams.get("operationName") is an empty string, null assigns operationNameParam because of S46.
        const operationNameParam = searchParams.get("operationName") || null;

        // @spec: S23, S43
        const variablesParam = searchParams.get("variables");
        let variables = {};
        if (variablesParam) {
            try {
                variables = JSON.parse(variablesParam);
            } catch (e) {
                // @spec: S5, S95, S97, S98, S43, S109
                return new Response("Bad request", { status: 400 });
            }
        }

        // @spec: S24, S43
        const extensionsParam = searchParams.get("extensions");
        let extensions = {};
        if (extensionsParam) {
            try {
                extensions = JSON.parse(extensionsParam);
            } catch (e) {
                // @spec: S5, S95, S97, S98, S43, S109
                return new Response("Bad request", { status: 400 });
            }
        }
    } else {
        // @spec: S19, S5, S95, S97, S98, S95, S97, S98
        return makeErrorResponse("4xx");
    }


    // @spec: S90
    // assert(data is GqlRequest);

    // TODO: @spec: S71, S72, S73
    // 以降は、wellformedgqlresponse を返さないといけない！

    // @spec: S116
    // isWellFormedGraphQLRequest の前か後か、パースはどっちで実行するのか？
    let document;
    try {
        document = parse(source);
    } catch (syntaxError) {
        return { errors: [syntaxError] };
    }

    // @spec: S91, S92
    // We use default validation rules (= specifiedRules).
    // They also contain a depth limit rule.
    const validationErrors = validate(schema, document, specifiedRules);
    if (validationErrors.length > 0) {
        // @spec: S94, S109, S117
        // TODO: cache
        return makeErrorResponse(400);
    }

    // これ以降は statusCodee は 200 である

    // @spec: S93
    execute({
        schema,
        document,
        rootValue,
        contextValue,
        variableValues,
        operationName,
        fieldResolver,
        typeResolver,
      });

    return new Response("", {
        // TODO: @spec: S100
        // data が null はどうする？ => S101 に書いてある
        // @spec: S120
        status: 200,
        headers: {
            // @spec: S75, S76
            // The server supports application/graphql-response+json only,
            // so given S76 "attempt to encode the response in the highest priority media type listed that is supported by the server",
            // we have to respond with application/graphql-response+json.
            // @spec: S82, S83, S84, S85, S86
            "Content-Type": RES_CONTENT_TYPE
        }
    });
}
*/

export const buildGqlOverHttpResult = <T>(
  gqlResponse: GqlResponse<T>
): GqlResponseAndHttpStatus<T> => {
  if (isGqlSuccessOrPartialSuccess(gqlResponse)) {
    return {
      httpResult: { statusCode: 200, message: null },
      gqlResponse,
    };
  }
  return {
    httpResult: { statusCode: 400, message: null },
    gqlResponse,
  };
};

export const handle = async <T>(
  httpRequest: Request,
  gqlImpl: GqlImpl<T>
): Promise<GqlResponseAndHttpStatus<T>> => {
  const GqlRequest = await buildGqlRequest(httpRequest);
  if (isGqlRequestErrorResponseAndHttpStatus(GqlRequest)) {
    return GqlRequest;
  }
  const gqlResponse = await gqlImpl(GqlRequest.data);
  return buildGqlOverHttpResult(gqlResponse);
};
