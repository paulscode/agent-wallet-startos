#!/bin/bash
# In-container health checks for the 0.3.5.x package. Run against the running
# main container (reached at agent-wallet.embassy:8100). Reads the elapsed
# duration (ms) from stdin and exits with health codes:
#   0 success | 60 starting (grace) | 61 loading | other failed.
#
# The dashboard liveness (/livez) is the MAIN ready signal and must not depend on
# LND. Node/DB connectivity (/ready) is a separate, non-blocking check that stays
# "loading" (61) — never fatal — while LND is locked or syncing.
URL=http://agent-wallet.embassy:8100

DURATION=$(</dev/stdin)

case "$1" in
  web-interface)
    if curl -fsS -o /dev/null "$URL/livez" 2>/dev/null; then exit 0; fi
    echo "The dashboard is starting." >&2
    exit 61
    ;;
  node-connectivity)
    if curl -fsS -o /dev/null "$URL/ready" 2>/dev/null; then exit 0; fi
    echo "Waiting on LND / database (the dashboard may already be usable)." >&2
    exit 61
    ;;
  *)
    echo "Usage: $0 [web-interface|node-connectivity]" >&2
    exit 1
    ;;
esac
