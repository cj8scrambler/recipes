#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

IMAGE="${IMAGE:-local/flash-build-env:latest}"
DOCKERFILE="${DOCKERFILE:-${SCRIPT_DIR}/Dockerfile}"

# Mount repository root if possible, otherwise pwd
if repo_root="$(git -C "${SCRIPT_DIR}" rev-parse --show-toplevel 2>/dev/null)"; then
  MOUNT_DIR="$(realpath "$repo_root")"
else
  MOUNT_DIR="$(realpath "$PWD")"
fi

# Build image if missing or if explicitly requested
if ! docker image inspect "$IMAGE" >/dev/null 2>&1 || [[ "${1:-}" == "--rebuild" ]]; then
  [[ "${1:-}" == "--rebuild" ]] && shift
  docker build -t "$IMAGE" -f "$DOCKERFILE" "$MOUNT_DIR"
fi

# Use TTY when attached to a terminal
TTY_OPTS=()
if [[ -t 0 && -t 1 ]]; then TTY_OPTS=(-it); fi

# Map host UID:GID to container user to avoid root-owned files
UID_GID="$(id -u):$(id -g)"

#PORTS=( -p 5173:5173 )
DOCKER_OPTS=( --rm --init "${TTY_OPTS[@]}" )
ENV_VARS=( -e "HOME=${MOUNT_DIR}" -e "USER=$(id -un)" -e "UID=$(id -u)" -e "GID=$(id -g)" -e "HISTFILE=/tmp/bash.history")
MOUNTS+=( -v "${MOUNT_DIR}:${MOUNT_DIR}" )


if [[ $# -gt 0 ]]; then
  CMD_STR="$*"
  DOCKER_CMD=( bash -lc -- "$CMD_STR" )
else
  DOCKER_CMD=( bash )
fi

# Allow passing through additional docker run args via DOCKER_EXTRA
# e.g., DOCKER_EXTRA="--network=host" for complex networking needs.
set -- "${@:-bash}"

docker run "${DOCKER_OPTS[@]}" \
  --network host \
  --user "$UID_GID" \
  "${ENV_VARS[@]}" \
  "${MOUNTS[@]}" \
  ${DOCKER_EXTRA:-} \
  -w "${MOUNT_DIR}" \
  "$IMAGE" "${DOCKER_CMD[@]}"
