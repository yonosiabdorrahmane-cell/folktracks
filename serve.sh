#!/usr/bin/env bash
# Serve Folktracks locally. Pass a port as $1 (default 8791).
set -euo pipefail
PORT="${1:-8791}"
cd "$(dirname "$0")"
echo "Folktracks → http://localhost:$PORT"
exec python3 -m http.server "$PORT"
