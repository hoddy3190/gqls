import { DEFAULT_ERROR_STATUS_CODE, getStatusText } from "./constant.js";
import { StatusCode, GqlRequestErrorResponseWithHttpStatus } from "./type.js";

export const buildSimpleGqlRequestErrorResponse = (
  statusCode: StatusCode = DEFAULT_ERROR_STATUS_CODE,
): GqlRequestErrorResponseWithHttpStatus => {
  return {
    httpStatus: { statusCode },
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
