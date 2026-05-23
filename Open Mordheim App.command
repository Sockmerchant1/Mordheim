#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

NODE_BIN="${NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN="$(command -v node)"
  elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
    NODE_BIN="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  fi
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Could not find Node.js."
  echo "Install Node 24 or newer from https://nodejs.org, then run this file again."
  read -r -p "Press Return to close..."
  exit 1
fi

export PATH="$(dirname "$NODE_BIN"):$PATH"
"$NODE_BIN" scripts/runLocal.mjs
