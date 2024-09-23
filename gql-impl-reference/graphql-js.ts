import { GraphQLArgs, ExecutionResult, graphql } from "graphql";
import { GqlError, GqlExtensions, GqlImpl } from "../src/type.js";

type DataType = ExecutionResult["data"];
type ErrorsType = ExecutionResult["errors"];
type ExtensionsType = ExecutionResult["extensions"];

// Omit properties which are expressed in GqlRequest
export type GraphqlJsArgs = Omit<
  GraphQLArgs,
  "source" | "operationName" | "variableValues"
>;

export const makeGqlImpl = (args: GraphqlJsArgs): GqlImpl<DataType> => {
  return async (gqlRequest) => {
    // @spec: S81, S82, S83, S84, S85
    // Validation rules: https://github.com/graphql/graphql-js/blob/9a91e338101b94fb1cc5669dd00e1ba15e0f21b3/src/validation/validate.ts#L41
    // Depth limit is included in them, but complexity limit is not.
    const result = await graphql({
      ...args,
      source: gqlRequest.query,
      operationName: gqlRequest.operationName,
      variableValues: gqlRequest.variables,
    });

    if ("data" in result) {
      if ("errors" in result) {
        return {
          data: result.data,
          errors: convertErrors(result.errors),
          extensions: convertExtensions(result.extensions),
        };
      } else {
        return {
          data: result.data,
          extensions: convertExtensions(result.extensions),
        };
      }
    } else {
      if ("errors" in result) {
        return {
          errors: convertErrors(result.errors),
          extensions: convertExtensions(result.extensions),
        };
      }
    }

    // This should not be reached.
    // If this is reached, it means that the behavior of graphql function has changed.
    return {
      errors: [{ message: "Unexpected error" }],
      extensions: {},
    };
  };
};

const convertErrors = (errors: ErrorsType): GqlError[] => {
  return (errors ?? []).map((e) => {
    const { message, locations, path } = e.toJSON();
    return {
      message,
      locations: (locations ?? []).map((l) => l),
      path: (path ?? []).map((p) => p),
    };
  });
};

const convertExtensions = (
  extensions: ExtensionsType,
): GqlExtensions["extensions"] => {
  return extensions ?? {};
};
