import { GraphQLArgs, graphql } from "graphql";
import {
  GqlWellFormedRequest,
  GqlResponse,
  GqlError,
  GqlExtensions,
  GqlImpl,
} from "./type.js";

type ExecutionResult = NonNullable<Awaited<ReturnType<typeof graphql>>>;
type DataType = ExecutionResult["data"];
type ErrorsType = ExecutionResult["errors"];
type ExtensionsType = ExecutionResult["extensions"];

// Omit properties which is contained in GqlWellFormedRequest
export type GraphQLJSArgs = Omit<
  GraphQLArgs,
  "operationName" | "source" | "variableValues"
>;
export type ConverterArgs = GraphQLJSArgs & { gqlRequest: GqlWellFormedRequest };
export type ImplArgs = ConverterArgs & { converter?: Converter };

export type Converter = (args: ConverterArgs) => GraphQLArgs;

const defaultConverter: Converter = (args) => {
  const {
    schema,
    rootValue,
    contextValue,
    fieldResolver,
    typeResolver,
    gqlRequest,
  } = args;
  return {
    schema,
    rootValue,
    contextValue,
    fieldResolver,
    typeResolver,
    source: gqlRequest.query,
    operationName: gqlRequest.operationName,
    variableValues: gqlRequest.variables,
  };
};

export const gqlImpl: GqlImpl<ImplArgs, DataType> = async (
  args: ImplArgs
): Promise<GqlResponse<DataType>> => {
  const graphqlArgs = (args.converter ?? defaultConverter)(args);
  const result = await graphql(graphqlArgs);

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
  extensions: ExtensionsType
): GqlExtensions["extensions"] => {
  return extensions ?? {};
};
