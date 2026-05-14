#!/bin/sh

set -e

TARGET_DIR="apps/client/build/"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: $TARGET_DIR directory not found!"
    exit 1
fi

echo "Starting environment variable replacement..."

# Debug: Show environment variables
echo "Environment variables:"
echo "VITE_API_URL: '$VITE_API_URL'"
echo "VITE_APP_URL: '$VITE_APP_URL'"
echo "VITE_APP_CLIENT_URL: '$VITE_APP_CLIENT_URL'"

PUBLIC_VARS="VITE_API_URL VITE_APP_URL VITE_APP_CLIENT_URL"

find $TARGET_DIR -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) | while read -r file; do
    # echo "Processing file: $file"
    for var in $PUBLIC_VARS; do
        eval "var_value=\$$var"
        if [ -n "$var_value" ]; then
            # echo "Replacing {{${var}}} with '${var_value}' in $file"
            sed -i "s|{{${var}}}|${var_value}|g" "$file"
        else
            echo "Warning: Environment variable $var is not set, skipping replacement in $file"
        fi
    done
done

# Verify if all variables were replaced
find $TARGET_DIR -type f \( -name "*.js" -o -name "*.html" -o -name "*.json" \) | while read -r file; do
    for var in $PUBLIC_VARS; do
        if grep -q "{{${var}}}" "$file"; then
            echo "Warning: Variable $var was not replaced in $file"
            exit 1
        fi
    done
done

exec "$@"