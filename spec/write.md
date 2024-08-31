## GraphQL Over HTTP

Note: **Stage 2: Draft** &mdash; this spec is not yet official, but is now a
fully formed solution. Drafts may continue to evolve and change, occasionally
dramatically, and are not guaranteed to be accepted. Therefore, it is unwise to
rely on a draft in a production GraphQL Service.

---

# GraphQL over HTTP

**Introduction**

This specification details how GraphQL should be served and consumed over HTTP
in order to maximize interoperability between clients, servers and tools. This
specification does not override or replace the
[GraphQL specification](https://spec.graphql.org), it extends it to cover the
topic of serving GraphQL services over HTTP. If any statement or algorithm in
this specification appears to conflict with the GraphQL specification, the
behavior detailed in the GraphQL specification should be used (and an issue
raised).

The [GraphQL specification](https://spec.graphql.org) deliberately does not
specify the transport layer, however HTTP is the most common choice when serving
GraphQL to remote clients due to its ubiquity.

Previous to this specification, the article
[Serving over HTTP](https://graphql.org/learn/serving-over-http)
([WayBack Machine entry, 1st June 2022](https://web.archive.org/web/20220601155421/https://graphql.org/learn/serving-over-http))
on the graphql.org website served as guidance, and leading implementations on
both client and server have mostly upheld those best practices and thus
established a de-facto standard that is commonly used throughout the ecosystem.
This specification aims to codify and expand on this work.

**Copyright notice**

Copyright © 2022-present, GraphQL contributors

THESE MATERIALS ARE PROVIDED “AS IS”. The parties expressly disclaim any
warranties (express, implied, or otherwise), including implied warranties of
merchantability, non-infringement, fitness for a particular purpose, or title,
related to the materials. The entire risk as to implementing or otherwise using
the materials is assumed by the implementer and user. IN NO EVENT WILL THE
PARTIES BE LIABLE TO ANY OTHER PARTY FOR LOST PROFITS OR ANY FORM OF INDIRECT,
SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES OF ANY CHARACTER FROM ANY CAUSES
OF ACTION OF ANY KIND WITH RESPECT TO THIS DELIVERABLE OR ITS GOVERNING
AGREEMENT, WHETHER BASED ON BREACH OF CONTRACT, TORT (INCLUDING NEGLIGENCE), OR
OTHERWISE, AND WHETHER OR NOT THE OTHER MEMBER HAS BEEN ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

**Conformance**

A conforming implementation of GraphQL over HTTP must fulfill all normative
requirements. Conformance requirements are described in this document via both
descriptive assertions and key words with clearly defined meanings.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in the normative portions of
this document are to be interpreted as described in
[IETF RFC 2119](https://tools.ietf.org/html/rfc2119). These key words may appear
in lowercase and still retain their meaning unless explicitly declared as
non-normative.

A conforming implementation of GraphQL over HTTP may provide additional
functionality, but must not where explicitly disallowed or would otherwise
result in non-conformance.

**Non-Normative Portions**

All contents of this document are normative except portions explicitly declared
as non-normative.

Examples in this document are non-normative, and are presented to aid
understanding of introduced concepts and the behavior of normative portions of
the specification. Examples are either introduced explicitly in prose (e.g. "for
example") or are set apart in example or counter-example blocks, like this:

```example
This is an example of a non-normative example.
```

```counter-example
This is an example of a non-normative counter-example.
```

Notes in this document are non-normative, and are presented to clarify intent,
draw attention to potential edge-cases and pit-falls, and answer common
questions that arise during implementation. Notes are either introduced
explicitly in prose (e.g. "Note: ") or are set apart in a note block, like this:

Note: This is an example of a non-normative note.

# Overview

**S1** | not yet implemented

Though [the GraphQL specification](https://spec.graphql.org) is transport
agnostic, this GraphQL over HTTP specification aims to map GraphQL's semantics
to their HTTP equivalents, enabling us to combine the full advantages of GraphQL
with the rich feature set of HTTP.

**S2** | implements [main.ts#L10](https://github.com/hoddy3190/gqls/blob/main/src/main.ts#L10), [main.ts#14](https://github.com/hoddy3190/gqls/blob/main/src/main.ts#L14)

GraphQL queries and mutations naturally mirror the request/response message
model used in HTTP, allowing us to provide a GraphQL request in an HTTP request
and a GraphQL response in an HTTP response.

**S3** | not yet implemented

:: In this document, the term _server_ refers to a GraphQL over HTTP
Specification compliant HTTP server unless the context indicates otherwise.

**S4** | not yet implemented

The role of a _server_ is to provide a _client_ access to one or more GraphQL
services over HTTP. A _server_ is not a _GraphQL service_, it is a GraphQL
service host.

**S5** | implemented at src/main.ts:8, src/main.ts:11, src/main.ts:13, src/main.ts:16, src/main.ts:20, src/main.ts:22, src/main.ts:25, src/main.ts:27, src/main.ts:28, src/main.ts:32, src/main.ts:33, src/main.ts:34, src/main.ts:37, src/main.ts:39, src/main.ts:44, src/main.ts:46, src/main.ts:47

:: In this document, the term _client_ refers to a GraphQL over HTTP
Specification compliant HTTP client unless the context indicates otherwise.

**S6** | not yet implemented

The role of a _client_ is to issue HTTP requests to a _server_ in order to
interact with a _GraphQL service_.

**S7** | not yet implemented

Note: GraphQL Subscriptions are beyond the scope of this specification at this
time.

# URL

**S8** | not yet implemented

A _server_ MUST enable GraphQL requests to one or more GraphQL schemas.

**S9** | not yet implemented

Each GraphQL schema a _server_ provides MUST be served via one or more URLs.

**S10** | not yet implemented

A _server_ MUST NOT require the _client_ to use different URLs for different
GraphQL query and mutation requests to the same GraphQL schema.

**S11** | not yet implemented

The GraphQL schema available via a single URL MAY be different for different
clients. For example, alpha testers or authenticated users may have access to a
schema with additional fields.

**S12** | not yet implemented

A _server_ MAY forbid individual requests by a _client_ to any endpoint for any
reason, for example to require authentication or payment; when doing so it
SHOULD use the relevant `4xx` or `5xx` status code. This decision SHOULD NOT be
based on the contents of a well-formed _GraphQL-over-HTTP request_.

**S13** | not yet implemented

Note: The _server_ should not make authorization decisions based on any part of
the _GraphQL request_; these decisions should be made by the _GraphQL schema_
during
[GraphQL's ExecuteRequest()](<https://spec.graphql.org/draft/#ExecuteRequest()>),
allowing for a partial response to be generated.

**S14** | not yet implemented

Server URLs which enable GraphQL requests MAY also be used for other purposes,
as long as they don't conflict with the server's responsibility to handle
GraphQL requests.

**S15** | not yet implemented

It is RECOMMENDED to end the path component of the URL with `/graphql`, for
example:

```url example
http://example.com/graphql
```

```url example
http://product.example.com/graphql
```

```url example
http://example.com/product/graphql
```

# Serialization Format

**S16** | not yet implemented

The GraphQL specification allows for many
[serialization formats to be implemented](https://spec.graphql.org/draft/#sec-Serialization-Format).
Servers and clients MUST support JSON and MAY support other, additional
serialization formats.

**S17** | not yet implemented

Note: Allowing other media types, particularly on requests, can be insecure.

**S18** | implemented at src/constant.ts:2

For consistency and ease of notation, examples of the response are given in JSON
throughout this specification.

## Media Types

**S19** | implemented at src/main.ts:47

The following are the officially recognized GraphQL media types to designate
using the JSON encoding for GraphQL requests:

| Name               | Description                             |
| ------------------ | --------------------------------------- |
| `application/json` | Standard type for GraphQL JSON requests |

**S20** | not yet implemented

And for a _GraphQL response_:

| Name                                | Description                                                        |
| ----------------------------------- | ------------------------------------------------------------------ |
| `application/graphql-response+json` | The preferred type for server responses; better HTTP compatibility |
| `application/json`                  | An alternative type for responses (to support legacy clients)      |

**S21** | implemented at src/main.ts:1, src/main.ts:15, src/main.ts:38

For details of the shapes of these JSON payloads, please see
[Request](#sec-Request) and [Response](#sec-Response).

**S22** | implemented at src/main.ts:2, src/main.ts:18, src/main.ts:42

If the media type in a `Content-Type` or `Accept` header does not include
encoding information and matches one of the officially recognized GraphQL media
types, then `utf-8` MUST be assumed (e.g. for header
`Content-Type: application/graphql-response+json`, UTF-8 encoding would be
assumed).

# Request

**S23** | implemented at src/main.ts:3, src/main.ts:19, src/main.ts:43

A server MUST accept POST requests, and MAY accept other HTTP methods, such as
GET.

## Request Parameters

**S24** | implemented at src/main.ts:4, src/main.ts:21, src/main.ts:45

:: A _GraphQL-over-HTTP request_ is an HTTP request that encodes the following
parameters in one of the manners described in this specification:

**S25** | implemented at src/main.ts:6, src/main.ts:9, src/main.ts:23

- {query} - (_Required_, string): The string representation of the Source Text
  of a GraphQL Document as specified in
  [the Language section of the GraphQL specification](https://spec.graphql.org/draft/#sec-Language).

**S26** | implemented at src/main.ts:6, src/main.ts:9, src/main.ts:23

- {operationName} - (_Optional_, string): The name of the Operation in the
  Document to execute.

**S27** | not yet implemented

- {variables} - (_Optional_, map): Values for any Variables defined by the
  Operation.

**S28** | not yet implemented

- {extensions} - (_Optional_, map): This entry is reserved for implementors to
  extend the protocol however they see fit.

**S29** | not yet implemented

Note: When comparing _GraphQL-over-HTTP request_ against the term
["request"](https://spec.graphql.org/draft/#request) in the GraphQL
specification you should note the _GraphQL schema_ and "initial value" are not
included in the GraphQL-over-HTTP _request_; they are handled by the _server_
based on the URL used.

**S30** | not yet implemented

Note: Be aware that `query` is a misleading parameter name as its value is a
string describing one or more operations, each of which may be a query or
mutation. A better name would have been `document`, but the term `query` is well
established.

**S31** | not yet implemented

Note: Depending on the serialization format used, values of the aforementioned
parameters can be encoded differently but their names and semantics must stay
the same.

**S32** | not yet implemented

Note: An HTTP request that encodes parameters of the same names but of the wrong
type, or that omits required parameters, is not a well-formed _GraphQL-over-HTTP
request_.

**S33** | not yet implemented

Note: Specifying `null` for optional request parameters is equivalent to not
specifying them at all.

**S34** | not yet implemented

Note: So long as it is a string, {query} does not have to parse or validate to
be part of a well-formed _GraphQL-over-HTTP request_.

## Accept

**S35** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24

A client SHOULD indicate the media types that it supports in responses using the
`Accept` HTTP header as specified in
[RFC7231](https://datatracker.ietf.org/doc/html/rfc7231).

**S36** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24

Note: If a client does not supply the `Accept` header then the server may
respond with an error, or with any content type it chooses. To ensure your
client gets something useful, it should indicate the media types it supports.

**S37** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24

If the client supplies an `Accept` header, the client SHOULD include the media
type `application/graphql-response+json` in the `Accept` header.

**S38** | ignored

Note: From 1st Jan 2025, every _server_ and _client_ must support
`application/graphql-response+json`, so including this in the Accept header
should give your client compatibility with any _server_.

### Legacy Watershed

**S39** | ignored

Before `2025-01-01T00:00:00Z`, if the client supplies an `Accept` header, the
header SHOULD include the `application/json` media type. After this watershed,
this is no longer necessary.

**S40** | implemented at src/main.ts:12, src/main.ts:36

It is RECOMMENDED that a client set the `Accept` header to
`application/graphql-response+json; charset=utf-8, application/json; charset=utf-8`.

**S41** | implemented at src/main.ts:17, src/main.ts:40

Note: This recommended header enables compatibility with legacy servers whilst
still leveraging modern features if available in the server.

## GET

**S42** | implemented at src/main.ts:18, src/main.ts:42

For HTTP GET requests, the _GraphQL-over-HTTP request_ parameters MUST be
provided in the query component of the request URL, encoded in the
`application/x-www-form-urlencoded` format as specified by the
[WhatWG URLSearchParams class](https://url.spec.whatwg.org/#interface-urlsearchparams).

**S43** | implemented at src/main.ts:19, src/main.ts:20, src/main.ts:21, src/main.ts:22, src/main.ts:43, src/main.ts:44, src/main.ts:45, src/main.ts:46

The {query} parameter MUST be the string representation of the source text of
the document as specified in
[the Language section of the GraphQL specification](https://spec.graphql.org/draft/#sec-Language).

**S44** | implemented at src/main.ts:18, src/main.ts:42

The {operationName} parameter, if present, must be a string.

**S45** | implemented at src/main.ts:14, src/main.ts:35

Each of the {variables} and {extensions} parameters, if used, MUST be encoded as
a JSON string.

**S46** | implemented at src/main.ts:18, src/main.ts:42

The {operationName} parameter, if supplied and not the empty string, represents
the name of the operation to be executed within the {query} as a string.

**S47** | not yet implemented

Note: In the final URL all of these parameters will appear in the query
component of the request URL as URL-encoded values due to the WhatWG
URLSearchParams encoding specified above.

**S48** | not yet implemented

Setting the value of the {operationName} parameter to the empty string is
equivalent to omitting the {operationName} parameter.

**S49** | not yet implemented

Note: By the above, `operationName=null` represents an operation with the name
`"null"` (such as `query null { __typename }`). If a literal `null` is desired,
either omit {operationName} or set it to the empty string.

### Example

**S50** | implemented at src/main.ts:17, src/main.ts:41

If we wanted to execute the following GraphQL query:

```raw graphql example
query($id: ID!){user(id:$id){name}}
```

With the following query variables:

```raw json example
{"id":"QVBJcy5ndXJ1"}
```

This request could be sent via an HTTP GET as follows:

```url example
http://example.com/graphql?query=query(%24id%3A%20ID!)%7Buser(id%3A%24id)%7Bname%7D%7D&variables=%7B%22id%22%3A%22QVBJcy5ndXJ1%22%7D
```

**S51** | implemented at src/main.ts:17, src/main.ts:41

GET requests MUST NOT be used for executing mutation operations. If the values
of {query} and {operationName} indicate that a mutation operation is to be
executed, the server MUST respond with error status code `405` (Method Not
Allowed) and halt execution. This restriction is necessary to conform with the
long-established semantics of safe methods within HTTP.

## POST

**S52** | implemented at src/main.ts:17, src/main.ts:41

A GraphQL POST request instructs the server to perform a query or mutation
operation. A GraphQL POST request MUST have a body which contains values of the
_GraphQL-over-HTTP request_ parameters encoded in one of the officially
recognized GraphQL media types, or another media type supported by the server.

**S53** | not yet implemented

A client MUST indicate the media type of a request body using the `Content-Type`
header as specified in [RFC7231](https://datatracker.ietf.org/doc/html/rfc7231).

**S54** | not yet implemented

A server MUST support POST requests encoded with the `application/json` media
type (as indicated by the `Content-Type` header) encoded with UTF-8.

**S55** | implemented at src/main.ts:26

For POST requests using an officially recognized GraphQL `Content-Type` without
indicating an encoding, the server MUST assume the encoding is `utf-8`.

**S56** | implemented at src/main.ts:29

If the client does not supply a `Content-Type` header with a POST request, the
server SHOULD reject the request using the appropriate `4xx` status code.

**S57** | implemented at src/main.ts:30

Note: Rejecting such requests encourages clients to supply a `Content-Type`
header with every POST request. A server has the option to assume any media type
they wish when none is supplied, with the understanding that parsing the request
may fail.

**S58** | implemented at src/main.ts:26

A server MAY support POST requests encoded with and/or accepting other media
types or encodings.

**S59** | implemented at src/main.ts:27

If a client does not know the media types the server supports then it SHOULD
encode the request body in JSON (i.e. with `Content-Type: application/json`).

**S60** | implemented at src/main.ts:29

Note: Request encoding with media type `application/json` is supported by every
compliant _server_.

### JSON Encoding

**S61** | implemented at src/main.ts:29, src/main.ts:30

When encoded in JSON, a _GraphQL-over-HTTP request_ is encoded as a JSON object
(map), with the properties specified by the GraphQL-over-HTTP request:

**S62** | ignored

- {query} - the string representation of the Source Text of the Document as
  specified in
  [the Language section of the GraphQL specification](https://spec.graphql.org/draft/#sec-Language).

**S63** | implemented at src/main.ts:29

- {operationName} - an optional string

**S64** | implemented at src/main.ts:31

- {variables} - an optional object (map), the keys of which are the variable
  names and the values of which are the variable values

**S65** | implemented at src/main.ts:1

- {extensions} - an optional object (map)

**S66** | implemented at src/main.ts:2

All other property names are reserved for future expansion; if implementors need
to add additional information to a request they MUST do so via other means, the
RECOMMENDED approach is to add an implementor-scoped entry to the {extensions}
object.

### Example

**S67** | implemented at src/main.ts:3

If we wanted to execute the following GraphQL query:

```raw graphql example
query ($id: ID!) {
  user(id: $id) {
    name
  }
}
```

With the following query variables:

```json example
{
  "id": "QVBJcy5ndXJ1"
}
```

This request could be sent via an HTTP POST to the relevant URL using the JSON
encoding with the headers:

```headers example
Content-Type: application/json
Accept: application/graphql-response+json
```

And the body:

```json example
{
  "query": "query ($id: ID!) {\n  user(id: $id) {\n    name\n  }\n}",
  "variables": {
    "id": "QVBJcy5ndXJ1"
  }
}
```

# Response

**S68** | implemented at src/main.ts:4

When a server receives a well-formed _GraphQL-over-HTTP request_, it must return
a well‐formed _GraphQL response_. The server's response describes the result of
validating and executing the requested operation if successful, and describes
any errors encountered during the request.

**S69** | implemented at src/main.ts:5

A server must comply with
[RFC7231](https://datatracker.ietf.org/doc/html/rfc7231).

## Body

**S70** | ignored

The body of the server's response MUST follow the requirements for a
[GraphQL response](#sec-Response), encoded directly in the chosen media type.

**S71** | not yet implemented

A server MUST indicate the media type of the response with a `Content-Type`
header, and SHOULD indicate the encoding (e.g.
`application/graphql-response+json; charset=utf-8`).

**S72** | not yet implemented

If an `Accept` header is provided, the server MUST respect the given `Accept`
header and attempt to encode the response in the highest priority media type
listed that is supported by the server.

**S73** | not yet implemented

In alignment with the
[HTTP 1.1 Accept](https://tools.ietf.org/html/rfc7231#section-5.3.2)
specification, when a client does not include at least one supported media type
in the `Accept` HTTP header, the server MUST either:

1. Respond with a `406 Not Acceptable` status code and stop processing the
   request (RECOMMENDED); OR
2. Disregard the `Accept` header and respond with the server's choice of media
   type (NOT RECOMMENDED).

**S74** | not yet implemented

Note: It is unlikely that a client can process a response that does not match
one of the media types it has requested, hence `406 Not Acceptable` being the
recommended response. However, the server authors may know better about the
specific clients consuming their endpoint, thus both approaches are permitted.

**S75** | implemented at src/main.ts:54

A server MUST support any _GraphQL-over-HTTP request_ which accepts the
`application/json` media type (as indicated by the `Accept` header).

**S76** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24, src/main.ts:54

A server SHOULD support any _GraphQL-over-HTTP request_ which accepts the
`application/graphql-response+json` media type (as indicated by the `Accept`
header).

**S77** | implemented at src/main.ts:8, src/main.ts:11, src/main.ts:25

Note: Prior to this specification, the media type `application/json` was in wide
use for the HTTP response payload type. Unfortunately this means clients cannot
trust responses from the server that do not use an HTTP 2xx status code (since
these replies may come from non-compliant HTTP servers or proxies somewhere in
the request chain). For this reason, this specification introduces the
`application/graphql-response+json` media type on responses; however, to give
existing servers time to move over, it is not required to be supported until 1st
January 2025.

### Legacy watershed

**S78** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24

From 1st January 2025 (`2025-01-01T00:00:00Z`), a server MUST support any
_GraphQL-over-HTTP request_ which accepts the
`application/graphql-response+json` media type (as indicated by the `Accept`
header) using the UTF-8 encoding.

**S79** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24

Before 1st January 2025 (`2025-01-01T00:00:00Z`), if the client does not supply
an `Accept` header, the server SHOULD treat the _GraphQL-over-HTTP request_ as
if it had `Accept: application/json`. From 1st January 2025
(`2025-01-01T00:00:00Z`), if the client does not supply an `Accept` header, the
server SHOULD treat the _GraphQL-over-HTTP request_ as if it had
`Accept: application/graphql-response+json`.

**S80** | not yet implemented

Note: This default is in place to maintain compatibility with legacy clients.

## Validation

**S81** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24

Validation of a well-formed _GraphQL-over-HTTP request_ SHOULD apply all the
[validation rules](https://spec.graphql.org/draft/#sec-Validation) specified by
the GraphQL specification.

**S82** | implemented at src/main.ts:55

The server MAY, at its discretion, apply additional validation rules.

**S83** | implemented at src/main.ts:55

Note: Examples of additional validation rules the server may apply include depth
limit, complexity limit, etc.

## Execution

**S84** | implemented at src/main.ts:55

Execution of a _GraphQL-over-HTTP request_ follows
[GraphQL's ExecuteRequest()](<https://spec.graphql.org/draft/#ExecuteRequest()>)
algorithm.

**S85** | implemented at src/main.ts:55

Note: In general, a _GraphQL-over-HTTP request_ that does not pass validation
should not be executed; however in certain circumstances, for example persisted
operations that were previously known to be valid, the server may attempt
execution regardless of validation errors.

## Status Codes

**S86** | implemented at src/main.ts:7, src/main.ts:10, src/main.ts:24, src/main.ts:55

In case of errors that completely prevent the generation of a well-formed
_GraphQL response_, the server SHOULD respond with the appropriate status code
depending on the concrete error condition, and MUST NOT respond with a `2xx`
status code when using the `application/graphql-response+json` media type.

**S87** | ignored

Note: Typically the appropriate status code will be `400` (Bad Request).

**S88** | implemented at src/main.ts:6, src/main.ts:9, src/main.ts:23

Note: This rule is "should" to maintain compatibility with legacy servers which
can return 200 status codes even when this type of error occurs, but only when
not using the `application/graphql-response+json` media type.

**S89** | ignored

Otherwise, the status codes depends on the media type with which the GraphQL
response will be served:

### application/json

**S90** | implemented at src/main.ts:48

This section only applies when the response body is to use the
`application/json` media type.

**S91** | implemented at src/main.ts:50

The server SHOULD use the `200` status code for every response to a well-formed
_GraphQL-over-HTTP request_, independent of any _GraphQL request error_ or
_GraphQL field error_ raised.

**S92** | implemented at src/main.ts:50

Note: A status code in the `4xx` or `5xx` ranges or status code `203` (and maybe
others) could originate from intermediary servers; since the client cannot
determine if an `application/json` response with arbitrary status code is a
well-formed _GraphQL response_ (because it cannot trust the source) the server
must use `200` status code to guarantee to the client that the response has not
been generated or modified by an intermediary.

**S93** | implemented at src/main.ts:52

If the _GraphQL response_ contains a non-null {data} entry then the server MUST
use the `200` status code.

**S94** | implemented at src/main.ts:51

Note: This indicates that no _GraphQL request error_ was raised, though one or
more _GraphQL field error_ may have been raised this is still a successful
execution - see "partial response" in the GraphQL specification.

**S95** | implemented at src/main.ts:8, src/main.ts:11, src/main.ts:13, src/main.ts:16, src/main.ts:20, src/main.ts:22, src/main.ts:25, src/main.ts:27, src/main.ts:28, src/main.ts:32, src/main.ts:33, src/main.ts:34, src/main.ts:37, src/main.ts:39, src/main.ts:44, src/main.ts:46, src/main.ts:47, src/main.ts:47

The server SHOULD NOT use a `4xx` or `5xx` status code for a response to a
well-formed _GraphQL-over-HTTP request_.

**S96** | implemented at src/constant.ts:1

Note: For compatibility with legacy servers, this specification allows the use
of `4xx` or `5xx` status codes for a failed well-formed _GraphQL-over-HTTP
request_ where the response uses the `application/json` media type, but it is
strongly discouraged. To use `4xx` and `5xx` status codes in these situations,
please use the `application/graphql-response+json` media type.

**S97** | implemented at src/main.ts:8, src/main.ts:11, src/main.ts:13, src/main.ts:16, src/main.ts:20, src/main.ts:22, src/main.ts:25, src/main.ts:27, src/main.ts:28, src/main.ts:32, src/main.ts:33, src/main.ts:34, src/main.ts:37, src/main.ts:39, src/main.ts:44, src/main.ts:46, src/main.ts:47, src/main.ts:47

If the URL is not used for other purposes, the server SHOULD use a `4xx` status
code to respond to a request that is not a well-formed _GraphQL-over-HTTP
request_.

**S98** | implemented at src/main.ts:8, src/main.ts:11, src/main.ts:13, src/main.ts:16, src/main.ts:20, src/main.ts:22, src/main.ts:25, src/main.ts:27, src/main.ts:28, src/main.ts:32, src/main.ts:33, src/main.ts:34, src/main.ts:37, src/main.ts:39, src/main.ts:44, src/main.ts:46, src/main.ts:47, src/main.ts:47

Note: For compatibility with legacy servers, this specification allows the use
of `2xx` or `5xx` status codes when responding to invalid requests using the
`application/json` media type, but it is strongly discouraged.

**S99** | ignored

Note: URLs that enable GraphQL requests may enable other types of requests - see
the [URL](#url) section.

#### Examples

**S100** | not yet implemented

The following examples provide guidance on how to deal with specific error cases
when using the `application/json` media type to encode the response body:

##### JSON parsing failure

**S101** | not yet implemented

For example a POST request body of `NONSENSE` or `{"query":` (note: invalid
JSON).

**S102** | not yet implemented

Requests that the server cannot interpret SHOULD result in status code `400`
(Bad Request).

##### Invalid parameters

**S103** | not yet implemented

For example a POST request body of `{"qeury": "{__typename}"}` (note: typo) or
`{"query": "query Q ($i:Int!) { q(i: $i) }", "variables": [7]}` (note: invalid
shape for `variables`).

A request that does not constitute a well-formed _GraphQL-over-HTTP request_
SHOULD result in status code `400` (Bad Request).

##### Document parsing failure

**S104** | not yet implemented

For example a POST request body of `{"query": "{"}`.

Requests where the _GraphQL document_ cannot be parsed SHOULD result in status
code `200` (Okay).

##### Document validation failure

**S105** | not yet implemented

Requests that fail to pass _GraphQL validation_, the server SHOULD NOT execute
the request and SHOULD return a status code of `200` (Okay).

##### Operation cannot be determined

**S106** | not yet implemented

If [GetOperation()](<https://spec.graphql.org/draft/#GetOperation()>) raises a
_GraphQL request error_, the server SHOULD NOT execute the request and SHOULD
return a status code of `200` (Okay).

##### Variable coercion failure

**S107** | not yet implemented

If
[CoerceVariableValues()](<https://spec.graphql.org/draft/#CoerceVariableValues()>)
raises a _GraphQL request error_, the server SHOULD NOT execute the request and
SHOULD return a status code of `200` (Okay).

**S108** | not yet implemented

For example the well-formed GraphQL-over-HTTP request:

```json
{
  "query": "query getItemName($id: ID!) { item(id: $id) { id name } }",
  "variables": { "id": null }
}
```

would fail variable coercion as the value for `id` would fail to satisfy the
query document's expectation that `id` is non-null.

##### Field errors encountered during execution

**S109** | implemented at src/main.ts:16, src/main.ts:20, src/main.ts:22, src/main.ts:34, src/main.ts:39, src/main.ts:44, src/main.ts:46, src/main.ts:51

If the operation is executed and no _GraphQL request error_ is raised then the
server SHOULD respond with a status code of `200` (Okay). This is the case even
if a _GraphQL field error_ is raised during
[GraphQL's ExecuteQuery()](<https://spec.graphql.org/draft/#ExecuteQuery()>) or
[GraphQL's ExecuteMutation()](<https://spec.graphql.org/draft/#ExecuteMutation()>).

<!--
When we add support for subscriptions,
[GraphQL's MapSourceToResponseEvent()](<https://spec.graphql.org/draft/#MapSourceToResponseEvent()>)
should be added to the above.
-->

### application/graphql-response+json

**S110** | not yet implemented

This section only applies when the response body is to use the
`application/graphql-response+json` media type.

**S111** | not yet implemented

If the _GraphQL response_ contains the {data} entry and it is not {null}, then
the server MUST reply with a `2xx` status code and SHOULD reply with `200`
status code.

**S112** | not yet implemented

Note: The result of executing a GraphQL operation may contain partial data as
well as encountered errors. Errors that happen during execution of the GraphQL
operation typically become part of the result, as long as the server is still
able to produce a well-formed _GraphQL response_. There's currently not an
approved HTTP status code to use for a "partial response," contenders include
WebDAV's status code "207 Multi-Status" and using a custom code such as "247
Partial Success."
[IETF RFC2616 Section 6.1.1](https://datatracker.ietf.org/doc/html/rfc2616#section-6.1.1)
states "codes are fully defined in section 10" implying that though more codes
are expected to be supported over time, valid codes must be present in this
document.

**S113** | ignored

If the _GraphQL response_ contains the {data} entry and it is {null}, then the
server SHOULD reply with a `2xx` status code and it is RECOMMENDED it replies
with `200` status code.

**S114** | implemented at src/main.ts:33

Note: Using `4xx` and `5xx` status codes in this situation is not recommended -
since no _GraphQL request error_ has occurred it is seen as a "partial
response".

**S115** | implemented at src/main.ts:16, src/main.ts:34, src/main.ts:39

If the _GraphQL response_ does not contain the {data} entry then the server MUST
reply with a `4xx` or `5xx` status code as appropriate.

**S116** | implemented at src/main.ts:49

Note: The GraphQL specification indicates that the only situation in which the
_GraphQL response_ does not include the {data} entry is one in which the
{errors} entry is populated.

**S117** | implemented at src/main.ts:51

If the request is not a well-formed _GraphQL-over-HTTP request_, or it does not
pass validation, then the server SHOULD reply with `400` status code.

**S118** | not yet implemented

If the client is not permitted to issue the GraphQL request then the server
SHOULD reply with `403`, `401` or similar appropriate status code.

#### Examples

**S119** | not yet implemented

The following examples provide guidance on how to deal with specific error cases
when using the `application/graphql-response+json` media type to encode the
response body:

##### JSON parsing failure

**S120** | implemented at src/main.ts:53

For example a POST request body of `NONSENSE` or `{"query":` (note: invalid
JSON).

Requests that the server cannot interpret should result in status code `400`
(Bad Request).

##### Invalid parameters

**S121** | not yet implemented

For example a POST request body of `{"qeury": "{__typename}"}` (note: typo) or
`{"query": "query Q ($i:Int!) { q(i: $i) }", "variables": [7]}` (note: invalid
shape for `variables`).

A request that does not constitute a well-formed _GraphQL-over-HTTP request_
SHOULD result in status code `400` (Bad Request).

##### Document parsing failure

**S122** | not yet implemented

For example a POST request body of `{"query": "{"}`.

Requests where the _GraphQL document_ cannot be parsed should result in status
code `400` (Bad Request).

##### Document validation failure

**S123** | not yet implemented

Requests that fail to pass _GraphQL validation_ SHOULD be denied execution with
a status code of `400` (Bad Request).

##### Operation cannot be determined

**S124** | not yet implemented

If [GetOperation()](<https://spec.graphql.org/draft/#GetOperation()>) raises a
_GraphQL request error_, the server SHOULD NOT execute the request and SHOULD
return a status code of `400` (Bad Request).

##### Variable coercion failure

**S125** | not yet implemented

If
[CoerceVariableValues()](<https://spec.graphql.org/draft/#CoerceVariableValues()>)
raises a _GraphQL request error_, the server SHOULD NOT execute the request and
SHOULD return a status code of `400` (Bad Request).

##### Field errors encountered during execution

**S126** | not yet implemented

If the operation is executed and no _GraphQL request error_ is raised then the
server SHOULD respond with a status code of `200` (Okay). This is the case even
if a _GraphQL field error_ is raised during
[GraphQL's ExecuteQuery()](<https://spec.graphql.org/draft/#ExecuteQuery()>) or
[GraphQL's ExecuteMutation()](<https://spec.graphql.org/draft/#ExecuteMutation()>).

<!--
When we add support for subscriptions,
[GraphQL's MapSourceToResponseEvent()](<https://spec.graphql.org/draft/#MapSourceToResponseEvent()>)
should be added to the above.
-->

**S127** | not yet implemented

Note: The GraphQL specification
[differentiates field errors from request errors](https://spec.graphql.org/draft/#sec-Handling-Field-Errors)
and refers to the situation wherein a _GraphQL field error_ occurs as a partial
response; it still indicates successful execution.

## Processing the response

**S128** | not yet implemented

If the response uses a non-`200` status code and the media type of the response
payload is `application/json` then the client MUST NOT rely on the body to be a
well-formed _GraphQL response_ since the source of the response may not be the
server but instead some intermediary such as API gateways, proxies, firewalls,
etc.