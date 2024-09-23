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
  // GraphQL-over-HTTP request doesn't include the GraphQL schema and “initial value”
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

// @spec: S70
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

export interface HttpStatus {
  statusCode: number;
}

export type GqlResponseWithHttpStatus<T> = {
  gqlResponse: GqlResponse<T>;
  httpStatus: HttpStatus;
};

export interface GqlRequestErrorResponseWithHttpStatus {
  gqlResponse: GqlRequestError;
  httpStatus: HttpStatus;
}

export type GqlImpl<T> = (gqlRequest: GqlRequest) => Promise<GqlResponse<T>>;

export type Success<T> = {
  success: true;
  data: T;
};
export type Failure<F> = {
  success: false;
  error: F;
};
export type Result<T, F extends object> = Success<T> | Failure<F>;

export const makeSuccess = <T>(data: T): Success<T> => ({
  success: true,
  data,
});
export const makeFailure = <F>(error: F): Failure<F> => ({
  success: false,
  error,
});
