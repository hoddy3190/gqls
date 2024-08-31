| S5 | A server MAY forbid individual requests by a client to any endpoint for any reason, for example to require authentication or payment; when doing so it SHOULD use the relevant 4xx or 5xx status code. |
| S6 | This decision SHOULD NOT be based on the contents of a well-formed GraphQL-over-HTTP request. |
| S7 | The server should not make authorization decisions based on any part of the GraphQL request; these decisions should be made by the GraphQL schema during GraphQL’s ExecuteRequest(), allowing for a partial response to be generated. |

individual requests とは何か？
authorization decisions とは何か？認証するか否かを決定することか、認証済みであるかどうかを決定することか、認証が必要なエンドポイントにリクエストが飛んできた時に拒絶することを決定することか
この決定はwellformedなリクエストの中身に基づいて決定すべきではない => 何に基づいて決定すべきなの？
S7によると、executerequestの最中のGraphQL の schema によって決定すべき
schemaとは？

| S95 | In case of errors that completely prevent the generation of a well-formed GraphQL response, the server SHOULD respond with the appropriate status code depending on the concrete error condition, and MUST NOT respond with a 2xx status code when using the application/graphql-response+json media type. |

完全に妨害するとは？

| S90 | Validation of a well-formed GraphQL-over-HTTP request SHOULD apply all the validation rules specified by the GraphQL specification. |

validation の段階では、well-formed な request であることは確定していそう

| S71 | When a server receives a well-formed GraphQL-over-HTTP request, it must return a well‐formed GraphQL response. |
| S72 | The server’s response describes the result of validating and executing the requested operation if successful, and describes any errors encountered during the request. |

S72から、validation でのエラーは、well-formed response を返さないといけないことは確定

| S34 | So long as it is a string, query does not have to parse or validate to be part of a well-formed GraphQL-over-HTTP request. |
S34 を見ると、well-formed GraphQL-over-HTTP request　の要件に parse の必要はない
つまり、parse の前の段階ですでに、well-formed GraphQL-over-HTTP request と言える