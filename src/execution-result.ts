/**
 * The following table shows the possible combinations of `errors`, `data`, and `extensions`
 * in the response.body.singleResult:
 *
 * "possibility" means whether the combination is possible or not.
 *
 * | errors    | data      | extensions | possibility | kind                            |
 * | ---       | ---       | ---        | ---         | ---                             |
 * | undefined | undefined | undefined  | x           | -                               |
 * | undefined | data      | undefined  | o           | success                         |
 * | undefined | null      | undefined  | o           | success                         | // errorが起きたから null になったのか、nullable 設定だから null なのかがわからない => いや、errors が undef なので nullable 設定だから null だ
 * | undefined | undefined | extensions | x           | -                               |
 * | undefined | data      | extensions | o           | success                         |
 * | undefined | null      | extensions | o           | success                         | // errorが起きたから null になったのか、nullable 設定だから null なのかがわからない => いや、errors が undef なので nullable 設定だから null だ
 * | errors    | undefined | undefined  | x           | -                               | // data が undef はありえない。partial か null が入っているはず
 * | errors    | data      | undefined  | o           | partial success (= field error) |
 * | errors    | null      | undefined  | o           | partial success (= field error) |
 * | errors    | undefined | extensions | x           | -                               | // data が undef はありえない。partial か null が入っているはず
 * | errors    | data      | extensions | o           | partial success (= field error) |
 * | errors    | null      | extensions | o           | partial success (= field error) |
 */

import type { ExecutionResult } from "graphql";
import { GqlFieldErrorResponse, GqlSuccessResponse } from "./type";

export function typeExecutionResult<TData, TExtensions>(
  executionResult: ExecutionResult<TData, TExtensions>
): GqlSuccessResponse<TData> | GqlFieldErrorResponse<TData> {
  const { data, errors, extensions } = executionResult;

  if (data === undefined) {
    throw new Error("data is undefined");
  }

  if (errors) {
    // この時点でパーシャルなエラーが発生していることは決定している
    // ふるエラーが発生しているかどうかは不明
    // でもパーシャルエラーが発生しているので、フルエラーは内包されている
    return {
      data,
      errors,
      extensions: { ...extensions, kind: "graphql_field_error" },
    };
  }
  return {
    data,
    extensions: { ...extensions, kind: "graphql_success" },
  };
}
