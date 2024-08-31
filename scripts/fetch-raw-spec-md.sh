#!/bin/sh -euo pipefail

SCRIPT_DIR=$(cd $(dirname "$0"); pwd)

commit_hash="511b7350e671d7a608a539df488436d37e5b897e"

curl "https://raw.githubusercontent.com/graphql/graphql-over-http/${commit_hash}/spec/GraphQLOverHTTP.md" \
> "${SCRIPT_DIR}/../spec/GraphQLOverHTTP_raw.md"
