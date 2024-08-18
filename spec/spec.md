| ID | Specification |
| :-: | :-- |
| S111 | Though the GraphQL specification is transport agnostic, this GraphQL over HTTP specification aims to map GraphQL’s semantics to their HTTP equivalents, enabling us to combine the full advantages of GraphQL with the rich feature set of HTTP.
| S112 | GraphQL queries and mutations naturally mirror the request/response message model used in HTTP, allowing us to provide a GraphQL request in an HTTP request and a GraphQL response in an HTTP response.
| S1 | A server MUST enable GraphQL requests to one or more GraphQL schemas. |
| S2 | Each GraphQL schema a server provides MUST be served via one or more URLs. |
| S3 | A server MUST NOT require the client to use different URLs for different GraphQL query and mutation requests to the same GraphQL schema. |
| S4 | The GraphQL schema available via a single URL MAY be different for different clients. For example, alpha testers or authenticated users may have access to a schema with additional fields. |
| S5 | A server MAY forbid individual requests by a client to any endpoint for any reason, for example to require authentication or payment; when doing so it SHOULD use the relevant 4xx or 5xx status code. |
| S6 | This decision SHOULD NOT be based on the contents of a well-formed GraphQL-over-HTTP request. |
| S7 | The server should not make authorization decisions based on any part of the GraphQL request; these decisions should be made by the GraphQL schema during GraphQL’s ExecuteRequest(), allowing for a partial response to be generated. |
| S8 | Server URLs which enable GraphQL requests MAY also be used for other purposes, as long as they don’t conflict with the server’s responsibility to handle GraphQL requests. |
| S9 | It is RECOMMENDED to end the path component of the URL with /graphql, for example:<br />http://example.com/graphql<br />http://product.example.com/graphql<br />http://example.com/product/graphql |
| S10 | The GraphQL specification allows for many serialization formats to be implemented. |
| S11 | Servers and clients MUST support JSON and MAY support other, additional serialization formats. |
| S12 | Allowing other media types, particularly on requests, can be insecure. |
| S13 | For consistency and ease of notation, examples of the response are given in JSON throughout this specification. |
| S14 | The following are the officially recognized GraphQL media types to designate using the JSON encoding for GraphQL requests:<br />[{ Name: application/json, Description: Standard type for GraphQL JSON requests }] |
| S15 | And for a GraphQL response:<br />{ application/graphql-response+json: The preferred type for server responses; better HTTP compatibility } |
| S16 | application/json: An alternative type for responses (to support legacy clients) |
| S17 | For details of the shapes of these JSON payloads, please see Request and Response. |
| S18 | If the media type in a Content-Type or Accept header does not include encoding information and matches one of the officially recognized GraphQL media types, then utf-8 MUST be assumed (e.g. for header Content-Type: application/graphql-response+json, UTF-8 encoding would be assumed). |
| S19 | A server MUST accept POST requests, and MAY accept other HTTP methods, such as GET. |
| S20 | A GraphQL-over-HTTP request is an HTTP request that encodes the following parameters in one of the manners described in this specification: |
| S21 | query - (Required, string): The string representation of the Source Text of a GraphQL Document as specified in the Language section of the GraphQL specification. |
| S22 | operationName - (Optional, string): The name of the Operation in the Document to execute. |
| S23 | variables - (Optional, map): Values for any Variables defined by the Operation. |
| S24 | extensions - (Optional, map): This entry is reserved for implementors to extend the protocol however they see fit. |
| S28 | When comparing GraphQL-over-HTTP request against the term “request” in the GraphQL specification you should note the GraphQL schema and “initial value” are not included in the GraphQL-over-HTTP request; they are handled by the server based on the URL used. |
| S29 | Be aware that query is a misleading parameter name as its value is a string describing one or more operations, each of which may be a query or mutation. |
| S30 | A better name would have been document, but the term query is well established. |
| S31 | Depending on the serialization format used, values of the aforementioned parameters can be encoded differently but their names and semantics must stay the same. |
| S32 | An HTTP request that encodes parameters of the same names but of the wrong type, or that omits required parameters, is not a well-formed GraphQL-over-HTTP request. |
| S33 | Specifying null for optional request parameters is equivalent to not specifying them at all. |
| S34 | So long as it is a string, query does not have to parse or validate to be part of a well-formed GraphQL-over-HTTP request. |
| S25 | A client SHOULD indicate the media types that it supports in responses using the Accept HTTP header as specified in RFC7231. |
| S26 | If a client does not supply the Accept header then the server may respond with an error, or with any content type it chooses. |
| S27 | To ensure your client gets something useful, it should indicate the media types it supports. |
| S35 | If the client supplies an Accept header, the client SHOULD include the media type application/graphql-response+json in the Accept header. |
| S36 | From 1st Jan 2025, every server and client must support application/graphql-response+json, so including this in the Accept header should give your client compatibility with any server. |
| S37 | Before 2025-01-01T00:00:00Z, if the client supplies an Accept header, the header SHOULD include the application/json media type. After this watershed, this is no longer necessary. |
| S38 | It is RECOMMENDED that a client set the Accept header to application/graphql-response+json; charset=utf-8, application/json; charset=utf-8. |
| S39 | This recommended header enables compatibility with legacy servers whilst still leveraging modern features if available in the server. |
| S40 | For HTTP GET requests, the GraphQL-over-HTTP request parameters MUST be provided in the query component of the request URL, encoded in the application/x-www-form-urlencoded format as specified by the WhatWG URLSearchParams class. |
| S41 | The query parameter MUST be the string representation of the source text of the document as specified in the Language section of the GraphQL specification. |
| S42 | The operationName parameter, if present, must be a string. |
| S43 | Each of the variables and extensions parameters, if used, MUST be encoded as a JSON string. |
| S44 | The operationName parameter, if supplied and not the empty string, represents the name of the operation to be executed within the query as a string. |
| S45 | In the final URL all of these parameters will appear in the query component of the request URL as URL-encoded values due to the WhatWG URLSearchParams encoding specified above. |
| S46 | Setting the value of the operationName parameter to the empty string is equivalent to omitting the operationName parameter. |
| S47 | By the above, operationName=null represents an operation with the name "null" (such as query null { __typename }). |
| S48 | If a literal null is desired, either omit operationName or set it to the empty string. |
| S49 | If we wanted to execute the following GraphQL query: query($id: ID!){user(id:$id){name}} With the following query variables: {"id":"QVBJcy5ndXJ1"} This request could be sent via an HTTP GET as follows: http://example.com/graphql?query=query(%24id%3A%20ID!)%7Buser(id%3A%24id)%7Bname%7D%7D&variables=%7B%22id%22%3A%22QVBJcy5ndXJ1%22%7D |
| S50 | GET requests MUST NOT be used for executing mutation operations. |
| S51 | If the values of query and operationName indicate that a mutation operation is to be executed, the server MUST respond with error status code 405 (Method Not Allowed) and halt execution. |
| S52 | This restriction is necessary to conform with the long-established semantics of safe methods within HTTP. |
| S53 | A GraphQL POST request instructs the server to perform a query or mutation operation. |
| S54 | A GraphQL POST request MUST have a body which contains values of the GraphQL-over-HTTP request parameters encoded in one of the officially recognized GraphQL media types, or another media type supported by the server. |
| S55 | A client MUST indicate the media type of a request body using the Content-Type header as specified in RFC7231. |
| S56 | A server MUST support POST requests encoded with the application/json media type (as indicated by the Content-Type header) encoded with UTF-8. |
| S57 | For POST requests using an officially recognized GraphQL Content-Type without indicating an encoding, the server MUST assume the encoding is utf-8. |
| S58 | If the client does not supply a Content-Type header with a POST request, the server SHOULD reject the request using the appropriate 4xx status code. |
| S59 | Rejecting such requests encourages clients to supply a Content-Type header with every POST request. |
| S60 | A server has the option to assume any media type they wish when none is supplied, with the understanding that parsing the request may fail. |
| S61 | A server MAY support POST requests encoded with and/or accepting other media types or encodings. |
| S62 | If a client does not know the media types the server supports then it SHOULD encode the request body in JSON (i.e. with Content-Type: application/json). |
| S63 | Request encoding with media type application/json is supported by every compliant server. |
| S64 | When encoded in JSON, a GraphQL-over-HTTP request is encoded as a JSON object (map), with the properties specified by the GraphQL-over-HTTP request: |
| S65 | query - the string representation of the Source Text of the Document as specified in the Language section of the GraphQL specification. |
| S66 | operationName - an optional string |
| S67 | variables - an optional object (map), the keys of which are the variable names and the values of which are the variable values |
| S68 | extensions - an optional object (map) |
| S69 | All other property names are reserved for future expansion; if implementors need to add additional information to a request they MUST do so via other means, the RECOMMENDED approach is to add an implementor-scoped entry to the extensions object. |
| S70 | If we wanted to execute the following GraphQL query: [e.g.2][e.g.2] |
| S71 | When a server receives a well-formed GraphQL-over-HTTP request, it must return a well‐formed GraphQL response. |
| S72 | The server’s response describes the result of validating and executing the requested operation if successful, and describes any errors encountered during the request. |
| S73 | A server must comply with RFC7231. |
| S74 | The body of the server’s response MUST follow the requirements for a GraphQL response, encoded directly in the chosen media type. |
| S75 | A server MUST indicate the media type of the response with a Content-Type header, and SHOULD indicate the encoding (e.g. application/graphql-response+json; charset=utf-8). |
| S76 | If an Accept header is provided, the server MUST respect the given Accept header and attempt to encode the response in the highest priority media type listed that is supported by the server. |
| S77 | In alignment with the HTTP 1.1 Accept specification, when a client does not include at least one supported media type in the Accept HTTP header, the server MUST either: Respond with a 406 Not Acceptable status code and stop processing the request (RECOMMENDED); OR Disregard the Accept header and respond with the server’s choice of media type (NOT RECOMMENDED). |
| S78 | It is unlikely that a client can process a response that does not match one of the media types it has requested, hence 406 Not Acceptable being the recommended response. |
| S79 | However, the server authors may know better about the specific clients consuming their endpoint, thus both approaches are permitted. |
| S80 | A server MUST support any GraphQL-over-HTTP request which accepts the application/json media type (as indicated by the Accept header). |
| S81 | A server SHOULD support any GraphQL-over-HTTP request which accepts the application/graphql-response+json media type (as indicated by the Accept header). |
| S82 | Prior to this specification, the media type application/json was in wide use for the HTTP response payload type. |
| S83 | Unfortunately this means clients cannot trust responses from the server that do not use an HTTP 2xx status code (since these replies may come from non-compliant HTTP servers or proxies somewhere in the request chain). |
| S84 | For this reason, this specification introduces the application/graphql-response+json media type on responses; |
| S85 | however, to give existing servers time to move over, it is not required to be supported until 1st January 2025. |
| S86 | From 1st January 2025 (2025-01-01T00:00:00Z), a server MUST support any GraphQL-over-HTTP request which accepts the application/graphql-response+json media type (as indicated by the Accept header) using the UTF-8 encoding. |
| S87 | Before 1st January 2025 (2025-01-01T00:00:00Z), if the client does not supply an Accept header, the server SHOULD treat the GraphQL-over-HTTP request as if it had Accept: application/json.  |
| S88 | From 1st January 2025 (2025-01-01T00:00:00Z), if the client does not supply an Accept header, the server SHOULD treat the GraphQL-over-HTTP request as if it had Accept: application/graphql-response+json. |
| S89 | This default is in place to maintain compatibility with legacy clients. |
| S90 | Validation of a well-formed GraphQL-over-HTTP request SHOULD apply all the validation rules specified by the GraphQL specification. |
| S91 | The server MAY, at its discretion, apply additional validation rules. |
| S92 | Examples of additional validation rules the server may apply include depth limit, complexity limit, etc. |
| S93 | Execution of a GraphQL-over-HTTP request follows GraphQL’s ExecuteRequest() algorithm. |
| S94 | In general, a GraphQL-over-HTTP request that does not pass validation should not be executed; however in certain circumstances, for example persisted operations that were previously known to be valid, the server may attempt execution regardless of validation errors. |
| S95 | In case of errors that completely prevent the generation of a well-formed GraphQL response, the server SHOULD respond with the appropriate status code depending on the concrete error condition, and MUST NOT respond with a 2xx status code when using the application/graphql-response+json media type. |
| S96 | Typically the appropriate status code will be 400 (Bad Request). |
| S97 | This rule is “should” to maintain compatibility with legacy servers which can return 200 status codes even when this type of error occurs, but only when not using the application/graphql-response+json media type. |
| S98 | Otherwise, the status codes depends on the media type with which the GraphQL response will be served: |
|  | 6.4.1 application/json は略 |
| S99 | This section only applies when the response body is to use the application/graphql-response+json media type. |
| S100 | If the GraphQL response contains the data entry and it is not null, then the server MUST reply with a 2xx status code and SHOULD reply with 200 status code. |
| S101 | The result of executing a GraphQL operation may contain partial data as well as encountered errors. |
| S102 | Errors that happen during execution of the GraphQL operation typically become part of the result, as long as the server is still able to produce a well-formed GraphQL response. |
| S103 | There’s currently not an approved HTTP status code to use for a “partial response,” contenders include WebDAV’s status code “207 Multi-Status” and using a custom code such as “247 Partial Success.” |
| S104 | IETF RFC2616 Section 6.1.1 states “codes are fully defined in section 10” implying that though more codes are expected to be supported over time, valid codes must be present in this document. |
| S105 | If the GraphQL response contains the data entry and it is null, then the server SHOULD reply with a 2xx status code and it is RECOMMENDED it replies with 200 status code. |
| S106 | Using 4xx and 5xx status codes in this situation is not recommended – since no GraphQL request error has occurred it is seen as a “partial response”. |
| S107 | If the GraphQL response does not contain the data entry then the server MUST reply with a 4xx or 5xx status code as appropriate. |
| S108 | The GraphQL specification indicates that the only situation in which the GraphQL response does not include the data entry is one in which the errors entry is populated. |
| S109 | If the request is not a well-formed GraphQL-over-HTTP request, or it does not pass validation, then the server SHOULD reply with 400 status code. |
| S110 | If the client is not permitted to issue the GraphQL request then the server SHOULD reply with 403, 401 or similar appropriate status code. |
| S113 | The following examples provide guidance on how to deal with specific error cases when using the application/graphql-response+json media type to encode the response body: |
| S114 | For example a POST request body of NONSENSE or {"query": (note: invalid JSON). Requests that the server cannot interpret should result in status code 400 (Bad Request). |
| S115 | For example a POST request body of {"qeury": "{__typename}"} (note: typo) or {"query": "query Q ($i:Int!) { q(i: $i) }", "variables": [7]} (note: invalid shape for variables). A request that does not constitute a well-formed GraphQL-over-HTTP request SHOULD result in status code 400 (Bad Request). |
| S116 | For example a POST request body of {"query": "{"}. Requests where the GraphQL document cannot be parsed should result in status code 400 (Bad Request). |
| S117 | Requests that fail to pass GraphQL validation SHOULD be denied execution with a status code of 400 (Bad Request). |
| S118 | If GetOperation() raises a GraphQL request error, the server SHOULD NOT execute the request and SHOULD return a status code of 400 (Bad Request). |
| S119 | If CoerceVariableValues() raises a GraphQL request error, the server SHOULD NOT execute the request and SHOULD return a status code of 400 (Bad Request). |
| S120 | If the operation is executed and no GraphQL request error is raised then the server SHOULD respond with a status code of 200 (Okay). This is the case even if a GraphQL field error is raised during GraphQL’s ExecuteQuery() or GraphQL’s ExecuteMutation(). |

[e.g.2]: #e.g.2
```
query ($id: ID!) {
  user(id: $id) {
    name
  }
}
With the following query variables:

{
  "id": "QVBJcy5ndXJ1"
}
This request could be sent via an HTTP POST to the relevant URL using the JSON encoding with the headers:

Content-Type: application/json
Accept: application/graphql-response+json
And the body:

{
  "query": "query ($id: ID!) {\n  user(id: $id) {\n    name\n  }\n}",
  "variables": {
    "id": "QVBJcy5ndXJ1"
  }
}
```