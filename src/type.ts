export type Location = {
  line: number;
  column: number;
};

export type Path = (string | number)[];

export type GqlErrorFormat = {
  message: string;
  locations?: Location[];
  path?: Path;
};

type ReplaceKeys2<U, T, Y> = {
  [K in keyof U]: K extends T ?
    K extends keyof Y ? Y[K] : never : U[K]
};

type ReplaceKey<U, T, Y> = {
  [K in keyof U]: K extends T ? Y : U[K]
};

export interface GqlSuccess<T> {
  data: T;
  extensions: Record<string, unknown>;
};



{
  data: GqlSuccess<T>["data"];
  extensions: {
    httpStatusCode: 200;
  } & GqlSuccess<T>["extensions"];
}


{
  data: T;
  extensions: {
    httpStatusCode: 200;
  };
};

export type GqlRequestError = {
  errors: GqlErrorFormat[];
  extensions?: any[];
};

export type GqlPartialSuccess<T> = {
  data: T | null;
  errors: GqlErrorFormat[];
  extensions?: any[];
};

export type GqlFieldError<T> = GqlPartialSuccess<T>;

export type Success<T> = {
  data: T;
};
export type RequestError = GqlRequestError;
export type MaybeGqlRequestError<T> = Success<T> | GqlRequestError;

export const isGqlRequestError = <T>(result: MaybeGqlRequestError<T>): result is GqlRequestError => {
  if ("errors" in result) return true;
  return false;
};

export type GqlResult<T> = GqlSuccess<T> | GqlRequestError | GqlFieldError<T>;

export type GqlOverHttpResult<T> = {
  httpResult: {
    statusCode: number;
    message: string | null;
  }
  gqlResult: GqlResult<T>;
};

// or
// export type GqlOverHttpSuccess<T> = ReplaceKey<GqlSuccess<T>, "extensions", { httpStatusCode: 200 }>;
// export type GqlOverHttpRequestError = ReplaceKey<GqlRequestError, "extensions", { httpStatusCode: number }>;
// export type GqlOverHttpFiledError<T> = ReplaceKey<GqlFieldError<T>, "extensions", { httpStatusCode: 200 }>;
// export type GqlOverHttpResult<T> = GqlOverHttpSuccess<T> | GqlOverHttpRequestError | GqlOverHttpFiledError<T>;

