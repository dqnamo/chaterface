#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
args=(start --all --log=stdout --config "$root/ngrok.yml")

if [[ -n "${NGROK_CONFIG:-}" && -f "$NGROK_CONFIG" ]]; then
	args+=(--config "$NGROK_CONFIG")
elif [[ -f "$HOME/Library/Application Support/ngrok/ngrok.yml" ]]; then
	args+=(--config "$HOME/Library/Application Support/ngrok/ngrok.yml")
elif [[ -f "$HOME/.config/ngrok/ngrok.yml" ]]; then
	args+=(--config "$HOME/.config/ngrok/ngrok.yml")
fi

exec ngrok "${args[@]}"
