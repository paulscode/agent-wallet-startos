#!/bin/bash
# Umbrel entrypoint for Agent Wallet.
#
# Umbrel has no StartOS-style config form, so user choices come from the
# environment (set by docker-compose with sensible defaults) and from which
# dependency apps are installed (wired host-side in exports.sh). This mirrors
# docker_entrypoint.sh (the StartOS 0.3.x shim): generate + persist the secrets,
# read LND's credentials from the mounted LND volume, wire the indexer/mempool,
# then hand off to the shared supervisor entrypoint (docker_entrypoint_040.sh),
# which sets the static infra env and execs s6-overlay.
#
# Inputs Umbrel provides (forwarded into the container by docker-compose):
#   APP_LIGHTNING_NODE_IP / APP_LIGHTNING_NODE_REST_PORT  - LND REST endpoint
#   APP_ELECTRS_NODE_IP   / APP_ELECTRS_NODE_PORT          - Electrum indexer
#       (Fulcrum re-exports these from its own values, so either indexer works)
#   APP_PASSWORD                                           - the Umbrel app password
#   AGENT_WALLET_MEMPOOL_API / _EXPLORER                   - optional local Mempool
#       (set in exports.sh when a Mempool app is installed; empty -> public)
#   AGENT_WALLET_ANONYMIZE / _LIQUID / _BOLT12 / _BRAIINS_DEPOSIT / _LOG_LEVEL
#       - feature toggles (compose defaults; advanced users can override)
# LND data is mounted read-only at /mnt/lnd; the data volume is /data.
set -e

DATA_DIR=/data
SECRETS="$DATA_DIR/secrets.env"
mkdir -p "$DATA_DIR"

# ── Secrets: generate once, persist on the data volume (captured by backups,
#    stable across restarts). python3 ships in the base image. ───────────────
if [ ! -f "$SECRETS" ]; then
  umask 077
  {
    echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
    echo "POSTGRES_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
    echo "REDIS_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
    echo "TOR_CONTROL_PASSWORD=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
    echo "BOLT12_GATEWAY_TOKEN=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  } > "$SECRETS"
fi
set -a; . "$SECRETS"; set +a

# ── Dashboard login: reuse the Umbrel app password so the user signs in with the
#    credential Umbrel already shows them. ────────────────────────────────────
export DASHBOARD_TOKEN="${APP_PASSWORD:-${DASHBOARD_TOKEN:-}}"

# ── Logging + feature toggles (Umbrel has no config UI; override via compose). ─
export LOG_LEVEL="${AGENT_WALLET_LOG_LEVEL:-INFO}"
export BRAIINS_DEPOSIT_ENABLED="$([ "${AGENT_WALLET_BRAIINS_DEPOSIT:-true}" = "false" ] && echo false || echo true)"

# BOLT 12 (default on): point the wallet at the co-resident gateway over loopback.
# Empty keeps the gateway s6 service idle. Only "false" disables it.
if [ "${AGENT_WALLET_BOLT12:-true}" != "false" ]; then
  export BOLT12_GATEWAY_GRPC="127.0.0.1:50061"
fi

# ── LND (Umbrel "lightning" app). Reach REST clearnet-internally; read the
#    pinned cert + admin macaroon from the read-only LND data mount. ──────────
LND_HOST="${APP_LIGHTNING_NODE_IP:-10.21.21.9}"
LND_REST_PORT="${APP_LIGHTNING_NODE_REST_PORT:-8080}"
export LND_REST_URL="https://${LND_HOST}:${LND_REST_PORT}"

# Detect the chain network from the macaroon subdir (robust; the app wants
# "bitcoin" for mainnet, pass-through otherwise).
NET=mainnet
for n in mainnet testnet signet regtest; do
  [ -d "/mnt/lnd/data/chain/bitcoin/$n" ] && NET="$n" && break
done
if [ "$NET" = "mainnet" ]; then export BITCOIN_NETWORK=bitcoin; else export BITCOIN_NETWORK="$NET"; fi
export LND_MACAROON_HEX="$(od -An -v -tx1 "/mnt/lnd/data/chain/bitcoin/$NET/admin.macaroon" 2>/dev/null | tr -d ' \n')"
export LND_TLS_CERT="$(base64 -w0 /mnt/lnd/tls.cert 2>/dev/null)"

# ── Indexer (Umbrel "electrs" app; Fulcrum re-exports APP_ELECTRS_* too). ─────
ELECTRS_IP="${APP_ELECTRS_NODE_IP:-10.21.21.10}"
ELECTRS_PORT="${APP_ELECTRS_NODE_PORT:-50001}"
export LND_ELECTRUM_URL="tcp://${ELECTRS_IP}:${ELECTRS_PORT}"

# ── Mempool (optional). exports.sh sets AGENT_WALLET_MEMPOOL_API to a local
#    Mempool's backend API when one is installed; otherwise fall back to the
#    public mempool.space API. CHAIN_BACKEND=auto (set in the 040 entrypoint)
#    prefers the local indexer and uses this only for fee estimates. The
#    explorer URL drives the dashboard's clickable links (browser-facing). ────
export LND_MEMPOOL_URL="${AGENT_WALLET_MEMPOOL_API:-https://mempool.space}"
export MEMPOOL_PUBLIC_URL="${AGENT_WALLET_MEMPOOL_EXPLORER:-https://mempool.space}"

# ── Anonymize (experimental; default off, opt-in via compose). When on, generate
#    + persist the Fernet key bundle once so the app's startup validators pass. ─
ANON_SECRETS="$DATA_DIR/anonymize-secrets.env"
if [ "${AGENT_WALLET_ANONYMIZE:-false}" = "true" ]; then
  export ANONYMIZE_ENABLED=true
  if [ ! -f "$ANON_SECRETS" ]; then
    umask 077
    k() { python3 -c 'import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())'; }
    {
      echo "ANONYMIZE_REUSE_DETECTION_KEY_FERNET=$(k)"
      echo "ANONYMIZE_HOP_IDEMPOTENCY_KEY_FERNET=$(k)"
      echo "ANONYMIZE_QUOTE_TOKEN_HMAC_KEY_FERNET=$(k)"
      echo "ANONYMIZE_QUOTE_CACHE_SIGNING_KEY_FERNET=$(k)"
      echo "ANONYMIZE_STEPUP_COOKIE_HMAC_KEY_FERNET=$(k)"
      echo "ANONYMIZE_DECOY_SEED_FERNET=$(k)"
      echo "ANONYMIZE_DECOY_SEED_ACCOUNT_KEY=$(k)"
      echo "ANONYMIZE_LIQUID_SEED_FERNET=$(k)"
    } > "$ANON_SECRETS"
  fi
  set -a; . "$ANON_SECRETS"; set +a
  # Liquid hop (optional; needs the electrs-liquid app). Its exports.sh provides
  # APP_ELECTRS_LIQUID_ELECTRS_NODE_IP / _NODE_PORT.
  if [ "${AGENT_WALLET_LIQUID:-false}" = "true" ]; then
    export ANONYMIZE_LIQUID_ENABLED=true
    export ANONYMIZE_LIQUID_INTEGRATION_VERIFIED=true
    LIQ_IP="${APP_ELECTRS_LIQUID_ELECTRS_NODE_IP:-10.21.21.50}"
    LIQ_PORT="${APP_ELECTRS_LIQUID_ELECTRS_NODE_PORT:-50001}"
    export ANONYMIZE_LIQUID_ELECTRUM_URL="tcp://${LIQ_IP}:${LIQ_PORT}"
  else
    export ANONYMIZE_LIQUID_ENABLED=false
  fi
else
  export ANONYMIZE_ENABLED=false
  export ANONYMIZE_LIQUID_ENABLED=false
fi

# ── Umbrel network defaults. The app_proxy reaches the dashboard over the
#    Umbrel docker subnet on plain HTTP, so trust that CIDR and don't force
#    secure cookies / HSTS (which would break login over LAN HTTP). ───────────
export TRUSTED_PROXIES="${TRUSTED_PROXIES:-10.21.0.0/16}"
export COOKIE_SECURE="${COOKIE_SECURE:-false}"
export ENABLE_HSTS="${ENABLE_HSTS:-false}"

exec /usr/local/bin/docker_entrypoint_040.sh
