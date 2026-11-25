#!/bin/bash

# Default values
DEFAULT_HOST="localhost"
DEFAULT_PORT="3000"
DEFAULT_API_VERSION="v1"
DEFAULT_OUTPUT_DIR="./src/lib/api"
DEFAULT_INTPUT_DIR="./scripts"
DEFAULT_SCHEMA_FILENAME="openapi-schema.json"
DEFAULT_TYPES_FILENAME="api-types.d.ts"

# Function to display usage information
show_usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  -h, --host         API host (default: $DEFAULT_HOST)"
    echo "  -p, --port         API port (default: $DEFAULT_PORT)"
    echo "  -v, --version      API version (default: $DEFAULT_API_VERSION)"
    echo "  -o, --output-dir   Output directory (default: $DEFAULT_OUTPUT_DIR)"
    echo "  -s, --schema-file  Schema filename (default: $DEFAULT_SCHEMA_FILENAME)"
    echo "  -t, --types-file   TypeScript types filename (default: $DEFAULT_TYPES_FILENAME)"
    echo "  --help            Show this help message"
}

# Function to validate directory existence and create if needed
ensure_directory() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        echo "Creating directory: $dir"
        mkdir -p "$dir"
    fi
}

# Function to check command existence
check_command() {
    local cmd="$1"
    if ! command -v "$cmd" &>/dev/null; then
        echo "Error: $cmd is not installed"
        exit 1
    fi
}

# Parse command line arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
    -h | --host)
        host="$2"
        shift
        ;;
    -p | --port)
        port="$2"
        shift
        ;;
    -v | --version)
        api_version="$2"
        shift
        ;;
    -o | --output-dir)
        output_dir="$2"
        shift
        ;;
    -s | --schema-file)
        schema_filename="$2"
        shift
        ;;
    -t | --types-file)
        types_filename="$2"
        shift
        ;;
    --help)
        show_usage
        exit 0
        ;;
    *)
        echo "Unknown parameter: $1"
        show_usage
        exit 1
        ;;
    esac
    shift
done

# Set default values if not provided
host="${host:-$DEFAULT_HOST}"
port="${port:-$DEFAULT_PORT}"
api_version="${api_version:-$DEFAULT_API_VERSION}"
output_dir="${output_dir:-$DEFAULT_OUTPUT_DIR}"
input_dir="${input_dir:-$DEFAULT_INTPUT_DIR}"
schema_filename="${schema_filename:-$DEFAULT_SCHEMA_FILENAME}"
types_filename="${types_filename:-$DEFAULT_TYPES_FILENAME}"

# Check required commands
check_command "curl"
check_command "pnpm"

# Ensure output directory exists
ensure_directory "$output_dir"

# Full paths for output files
schema_path="$input_dir/$schema_filename"
types_path="$output_dir/$types_filename"

# Download OpenAPI schema
echo "Downloading OpenAPI schema from http://$host:$port/api/$api_version/openapi/spec.json"
if ! curl -f "http://$host:$port/api/$api_version/openapi/spec.json" -o "$schema_path"; then
    echo "Error: Failed to download OpenAPI schema"
    exit 1
fi

# Generate TypeScript types
echo "Generating TypeScript types..."
if ! pnpm  openapi-typescript --default-non-nullable false "$schema_path" -o "$types_path"; then
    echo "Error: Failed to generate TypeScript types"
    exit 1
fi

echo "Successfully generated:"
echo "- Schema: $schema_path"
echo "- Types: $types_path"
