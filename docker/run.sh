#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

IMAGE="${IMAGE:-local/flash-build-env:latest}"
DOCKERFILE="${DOCKERFILE:-${SCRIPT_DIR}/Dockerfile}"

# Build the image if it doesn't exist, or when explicitly requested
if ! docker image inspect "$IMAGE" >/dev/null 2>&1 || [[ "${1:-}" == "--rebuild" ]]; then
  [[ "${1:-}" == "--rebuild" ]] && shift
  docker build -t "$IMAGE" -f "$DOCKERFILE" .
fi

# Use TTY when attached to a terminal
TTY_OPTS=()
if [[ -t 0 && -t 1 ]]; then TTY_OPTS=(-it); fi

# Match host user to avoid root-owned build artifacts
UID_GID="$(id -u):$(id -g)"

docker run --rm "${TTY_OPTS[@]}" \
  --user "$UID_GID" \
  -e HOME=/workspace \
  -p 5173:5173 \
  -v "$PWD":/workspace \
  -v "$HOME/.gitconfig":/etc/gitconfig:ro \
  -w /workspace \
  "$IMAGE" ${@:-bash}
