export type StatusCode = 200 | 400 | 405 | 406;

// @spec: S24, S31, S61
export interface GqlRequest {
  // @spec: S25, S30
  query: string;
  // @spec: S26
  operationName: string | null;
  // @spec: S27
  variables: Record<string, unknown>;
  // @spec: S28
  extensions: Record<string, unknown>;
  // @spec: S29
  // not include the GraphQL schema and “initial value”
}

export interface Location {
  readonly line: number;
  readonly column: number;
}

export type Path = (string | number)[];

export interface GqlError {
  readonly message: string;
  readonly locations?: Location[];
  readonly path?: Path;
}

export interface GqlExtensions {
  extensions: Record<string, unknown>;
}

export interface GqlSuccess<T> extends GqlExtensions {
  data: T;
}

// The errors in GqlPartialSuccess are field errors.
export interface GqlPartialSuccess<T> extends GqlExtensions {
  data: T | null;
  errors: GqlError[];
}

export interface GqlRequestError extends GqlExtensions {
  errors: GqlError[];
}

// @spec: 70
// GqlResponse type expresses "well-formed GraphQL response" which is used in GraphQL Over HTTP.
export type GqlResponse<T> =
  | GqlSuccess<T>
  | GqlPartialSuccess<T>
  | GqlRequestError;

export const isGqlSuccessOrPartialSuccess = <T>(
  result: GqlResponse<T>
): result is GqlSuccess<T> | GqlPartialSuccess<T> => {
  if ("data" in result) return true;
  return false;
};

export const isGqlRequestError = <T>(
  result: GqlPartialSuccess<T> | GqlRequestError
): result is GqlRequestError => {
  if (!("data" in result)) return true;
  return false;
};

export interface HttpResult {
  statusCode: number;
  message: string | null;
}

export type GqlResponseAndHttpStatus<T> = {
  gqlResponse: GqlResponse<T>;
  httpResult: HttpResult;
};

export type GqlImpl<T> = (gqlRequest: GqlRequest) => Promise<GqlResponse<T>>;

type Success<T> = {
  data: T;
};
export type RequestError = GqlRequestError;

export interface GqlRequestErrorResponseAndHttpStatus {
  gqlResponse: GqlRequestError;
  httpResult: HttpResult;
}

export type MaybeGqlRequestError<T> =
  | Success<T>
  | GqlRequestErrorResponseAndHttpStatus;

export const isGqlRequestErrorResponseAndHttpStatus = <T>(
  result: MaybeGqlRequestError<T>
): result is GqlRequestErrorResponseAndHttpStatus => {
  if ("gqlResponse" in result || "httpResult" in result) return true;
  return false;
};
