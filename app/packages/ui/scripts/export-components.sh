#!/bin/bash

set -e

PACKAGE_JSON="package.json"

if !(command -v jq &> /dev/null); then
  echo "jq could not be found. Please install jq to run this script."
  exit 1
fi

EXPORTS=$(cat <<EOF
{
  ".": "./src/index.ts"
EOF
)

for file in src/*.tsx; do
  filename=$(basename "$file" .tsx)
  if [[ "$filename" != "index" ]]; then
    EXPORTS="$EXPORTS,
  \"./$filename\": \"./src/$filename.tsx\""
  fi
done

EXPORTS="$EXPORTS
}
"

jq --argjson newExports "$EXPORTS" '.exports = $newExports' "$PACKAGE_JSON" > tmp.$$.json && mv tmp.$$.json "$PACKAGE_JSON"

echo "package.json exports updated."
