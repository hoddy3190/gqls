# gqls



is well-formed request?

```mermaid
flowchart TD;
    A[Request] --> B{has no method accept contenttype error?}
    B --> |No| B1
    B --> |Yes| C{is well-formed request?}
    C -->|No| D[StatusCode: 4xx\n]
    C -->|Yes| E{can be parsed?}
    E --> |No| F[statusCode: 400\nwell-formed-response\nno data entry]
    E --> |Yes| G{has no validation error?}
    G --> |No| H[statusCode: 400\nwell-formed-response\nno data entry]
    G --> |Yes| I{has no filed errors?\n SQE during execution}
    I --> |No| J[statusCode: 200\nwell-formed-response]
    I --> |Yes| K[statusCode: 200\nwell-formed-response]
```

well-formed-response
https://spec.graphql.org/draft/#sec-Response-Format

```
If a request error is raised, the data entry in the response must not be present, the errors entry must include the error, and request execution should be halted.
```
より、基本的には well-formed-response で返すのが良さそう


```mermaid
sequenceDiagram
    participant C as your client
    actor U as gql-request-handler user (server side)
    participant H as gql-request-handler
    participant G as GraphQL impl
    C ->>  U: HTTP request
    U ->> H: HTTP request & GraphQL impl
    H ->>  H: construct well-formed GraphQL request from HTTP request
    alt has some errors
        H ->> U: well-formed GraphQL error response & httpStatusCode
    end
    H ->>  G: well-formed GraphQL request
    G ->>  G: process GraphQL (parse, validate and execute)
    G ->>  H: well-formed GraphQL response
    H ->>  H: assign the well-formed GraphQL response to Request Error or Field Error or Success to decide httpStatusCode
    H ->> U: well-formed GraphQL Response & httpStatusCode
    U ->>  C: HTTP Response whose data format applies GraphQL specification
```

This Library User knows the types of well-formed GraphQL request and well-formed GraphQL response. 

Spec update

1. fetch
2. assign spec id it's man= manually paragraph or line or semantics block it depends on human.
3. relate spec id in imple files or ignores
4. build gh-page-build.ts
  - It also checks whether all spec ids are in imple or ignores.
5. main branch docs index.html it is published automatically