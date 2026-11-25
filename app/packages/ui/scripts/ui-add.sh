#!/bin/bash

set -e

pnpm dlx shadcn@latest add -o $1
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's/src\/lib\/utils/@repo\/ui/g' {} +
pnpm run export
pnpm lint
