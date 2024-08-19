import { execute, specifiedRules, validate } from "graphql";

import * as HEADER_KEY from "./header.js";
import { includeMediaType, MediaType, parseMediaRange, parseMediaType } from "./media-type.js";
import { parse } from "path/posix";

// S18
const DEFAULT_ENCODING = "utf-8";

// @spec: S96
const DEFAULT_ERROR_STATUS_CODE = 400;

export type StatusCode = 200 | typeof DEFAULT_ERROR_STATUS_CODE | 405 | 406;







const GET_REQ_MEDIA_TYPE  = "application/x-www-form-urlencoded";
const POST_REQ_MEDIA_TYPE = "application/json";
const RES_MEDIA_TYPE: MediaType = {
    type: "application",
    subtype: "graphql-response+json",
    mediaType: "application/graphql-response+json",
}
const RES_CONTENT_TYPE = RES_MEDIA_TYPE.mediaType + "; charset=" + DEFAULT_ENCODING;


const RECOGNIZED_MEDIA_TYPE = {
    // S14
    REQ: new Set<MIME_TYPE.Typ>({
        MIME_TYPE.JSON,
    }),
    // S15, S16
    RES:  new Set<MIME_TYPE.Typ>({
        MIME_TYPE.JSON,
        MIME_TYPE.GRAPHQL_RES,
    }),
};

// S19
type ServerAcceptableMethods =
    "POST" // MUST
  | "GET"; // MAY

const SERVER_MUST_SUPPORT_MIME_TYPES = new Set([
    // S80, S11, S14
    "application/json",
    // S81
    "application/graphql-response+json",
]);

const isWellFormedGraphQLRequest = (req: Request): boolean => {
    return false;
};


export const validateContentType = (contentType: string): boolean => {
    try {
        const mimeType = new MIMEType(contentType);
        const charset = mimeType.params.get("charset");
        if (charset) {
            if (charset !== DEFAULT_ENCODING) return false;
        }
        if (mimeType.essence != MIME_TYPE.JSON) {
            return false;
        };
    } catch (e) {
        return false;
    }

    return true;
}

const statusCodeToStatusText: { [code in StatusCode]: string } = {
    200: "OK",
    400: "Bad Request",
    405: "Method Not Allowed",
    406: "Not Acceptable",
};

const makeErrorResponse = (statusCode: StatusCode, bodyText?: string): Response => {
    const statusText = statusCodeToStatusText[statusCode];
    return new Response(bodyText, { status: statusCode, statusText });
}

interface WellFormedGqlRequest {
    query: string;
    operationName?: string;
    variables?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
}

const isStringRecord = (o: unknown): o is Record<string, unknown> => {
    return (
        !!o && typeof o === 'object' && !Buffer.isBuffer(o) && !Array.isArray(o)
    );
}

const isNonEmptyStringRecord = (o: unknown): o is Record<string, unknown> => {
    return isStringRecord(o) && Object.keys(o).length > 0;
}

const isWellFormedGqlRequest = (data: unknown): data is WellFormedGqlRequest => {
    if (!isNonEmptyStringRecord(data)) return false;

    const len = Object.keys(data).length;
    // The key "query" is required, and the keys "operationName", "variables", and "extensions" are optional.
    // At most these 4 keys are allowed.
    if (len < 1 || len > 4) return false;

    let keyCount = 0;

    if (data["query"] === undefined || typeof data["query"] !== "string") return false;
    keyCount++;

    if (data["operationName"] !== undefined) {
        if (typeof data["operationName"] !== "string") return false;
        keyCount++;
    }

    if (data["variables"] !== undefined) {
        if (!isStringRecord(data["variables"])) return false;
        keyCount++;
    }

    if (data["extensions"] !== undefined) {
        if (!isStringRecord(data["extensions"])) return false;
        keyCount++;
    }

    if (keyCount !== len) return false;

    return true;
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
        return new Response("Bad request", { status: 4xx });
    }

    // S36, S37
    // S35を上書き
    const mediaRange = parseMediaRange(clientAcceptableMimeType);
    if (!mediaRange) {
        // S5, S95, S97, S98
        return new Response("Bad request", { status: 4xx });
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

        // @spec: S65
        const query = body.query;
        if (typeof query !== "string") {
            // @spec: S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }

        // @spec: S66
        const operationName = body.operationName;
        if (operationName !== undefined && typeof operationName !== "string") {
            // @spec: S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }

        // @spec: S67
        const variables = body.variables;
        if (variables !== undefined && typeof variables !== "object") {
            // @spec: S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }

        // @spec: S68
        const extensions = body.extensions;
        if (extensions !== undefined && typeof extensions !== "object") {
            // @spec: S5, S95, S97, S98
            return new Response("Bad request", { status: 400 });
        }

        // @spec: S69
        if (Object.keys(body).length > 4) {
            // @spec: S5, S95, S97, S98
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
            // @spec: S5, S95, S97, S98, S115
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
                // @spec: S5, S95, S97, S98, S43
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
                // @spec: S5, S95, S97, S98, S43
                return new Response("Bad request", { status: 400 });
            }
        }
    } else {
        // @spec: S19, S5, S95, S97, S98, S95, S97, S98
        return makeErrorResponse("4xx");
    }


    // @spec: S90
    if (isWellFormedGraphQLRequest(req)) {
        // TODO: @spec: S71, S72, S73


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
    } else {
        // @spec: S109
        return makeErrorResponse(400);
    }

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