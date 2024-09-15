import { DEFAULT_ERROR_STATUS_CODE, getStatusText } from "./constant.js";
import { StatusCode, GqlRequestErrorResponseAndHttpStatus } from "./type.js";

export const buildSimpleGqlRequestErrorResponse = (
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
