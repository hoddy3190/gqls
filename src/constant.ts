import { MediaType, serializeMediaType } from "./media-type.js";
import { StatusCode } from "./type.js";

export const CONTENT_TYPE_KEY = "Content-Type";
export const ACCEPT_KEY = "Accept";

export const POST_REQUEST_CONTENT_TYPE = "application/json";

// @spec: S87
export const DEFAULT_ERROR_STATUS_CODE = 400;

export const getStatusText = (statusCode: StatusCode): string => {
  switch (statusCode) {
    case 200:
      return "OK";
    case 400:
      return "Bad Request";
    case 405:
      return "Method Not Allowed";
    case 406:
      return "Not Acceptable";
    default:
      statusCode satisfies never;
      throw new Error(`Unexpected status code: ${statusCode}`);
  }
};

// @spec: S22
export const DEFAULT_ENCODING = "utf-8";

export const GQL_RESPONSE_MEDIA_TYPE: MediaType = {
  type: "application",
  subtype: "graphql-response+json",
  mediaType: "application/graphql-response+json",
  // @spec: S22
  parameters: { charset: DEFAULT_ENCODING },
};
export const GQL_RESPONSE_CONTENT_TYPE = serializeMediaType(
  GQL_RESPONSE_MEDIA_TYPE
);
