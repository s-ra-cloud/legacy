#!/bin/bash

resource="$1"

# shift arguments by one
shift

deno run -A ./scripts/compile-resources.ts "$resource"
shadgn ./resources/"$resource".json $@
# pnpm turbo run lint:fix --filter=@repo/server
