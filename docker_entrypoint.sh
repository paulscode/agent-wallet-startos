#!/bin/bash
# StartOS 0.3.5.x entrypoint. The 0.4.x path sets the dynamic/secret environment
# in main.ts; on 0.3.x there is no main.ts, so this shim does the equivalent:
# reads the rendered config, generates+persists the secrets, reads LND's
# credentials from the mounted dependency volume, then hands off to the shared
# supervisor entrypoint (which sets the static infra env and execs s6).
set -e

CONFIG=/data/start9/config.yaml
SECRETS=/data/secrets.env

# Flat scalar config — parsed with awk so the image needs no yq. Only the first
# "key: " is stripped, so values that themselves contain colons (e.g. a URL) are
# returned intact; surrounding quotes are removed.
read_cfg() {
  awk -v k="$1" '
    $0 ~ "^"k":[ \t]" {
      sub("^"k":[ \t]+", "")
      sub(/[ \t]+$/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }' "$CONFIG" 2>/dev/null
}

# Read an indented child `key:` inside a top-level parent block (e.g. a union
# value rendered as a nested object). Stops at the next non-indented line.
read_cfg_nested() {
  awk -v p="$1" -v k="$2" '
    $0 ~ "^"p":[ \t]*$" { f=1; next }
    f && /^[^ \t]/ { exit }
    f && $0 ~ "^[ \t]+"k":[ \t]" {
      sub("^[ \t]+"k":[ \t]+", "")
      sub(/[ \t]+$/, "")
      gsub(/^"|"$/, "")
      print
      exit
    }' "$CONFIG" 2>/dev/null
}

# Generate + persist the base secrets once (python3 ships in the base image).
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
set -a
. "$SECRETS"
set +a

# Config selections (defaults match the config spec).
INDEXER="$(read_cfg indexer)"; [ -n "$INDEXER" ] || INDEXER=electrs
# mempool is a union: the selected flavor is the nested `type` tag.
MEMPOOL="$(read_cfg_nested mempool type)"; [ -n "$MEMPOOL" ] || MEMPOOL=mempool-rdts
LOG_LEVEL="$(read_cfg log-level)"; [ -n "$LOG_LEVEL" ] || LOG_LEVEL=INFO
ANON="$(read_cfg anonymize)"
LIQ="$(read_cfg liquid)"
export LOG_LEVEL
export DASHBOARD_TOKEN="$(read_cfg dashboard-password)"

# Braiins / Pool Deposit tab (default on). Only an explicit "false" hides it.
export BRAIINS_DEPOSIT_ENABLED="$([ "$(read_cfg braiins-deposit)" = "false" ] && echo false || echo true)"

# BOLT 12 (default on): point the wallet at the co-resident gateway daemon over
# loopback. Empty when the toggle is off, which also keeps the gateway s6 service
# idle. Only "false" disables it (a missing key defaults on).
if [ "$(read_cfg bolt12)" != "false" ]; then
  export BOLT12_GATEWAY_GRPC="127.0.0.1:50061"
fi

# LND (0.3.x hostname is lnd.embassy). Detect the macaroon network subdir.
export LND_REST_URL="https://lnd.embassy:8080"
NET=mainnet
for n in mainnet testnet signet regtest; do
  [ -d "/mnt/lnd/data/chain/bitcoin/$n" ] && NET="$n" && break
done
if [ "$NET" = "mainnet" ]; then export BITCOIN_NETWORK=bitcoin; else export BITCOIN_NETWORK="$NET"; fi
export LND_MACAROON_HEX="$(od -An -v -tx1 "/mnt/lnd/data/chain/bitcoin/$NET/admin.macaroon" 2>/dev/null | tr -d ' \n')"
export LND_TLS_CERT="$(base64 -w0 /mnt/lnd/tls.cert 2>/dev/null)"

# Indexer + Mempool selection (0.3.x .embassy hostnames).
export LND_ELECTRUM_URL="tcp://${INDEXER}.embassy:50001"
export LND_MEMPOOL_URL="http://${MEMPOOL}.embassy:8999"

# User-facing Mempool explorer URL for the dashboard's clickable links. The
# internal LND_MEMPOOL_URL (.embassy) is NOT browser-reachable. Resolve, in order:
#   1. an explicit operator override (mempool-explorer-url),
#   2. the installed Mempool's own LAN (.local) address, derived from its Tor
#      address auto-detected via a config pointer (the .onion and .local share
#      the same base, so swapping the suffix yields the LAN URL),
#   3. the public mempool.space.
# The selected variant carries its own tor-address pointer (resolved by the host).
MP_TOR="$(read_cfg_nested mempool tor-address)"
case "$MP_TOR" in ""|"null"|"~") MP_TOR="" ;; esac
AUTO_MEMPOOL_URL=""
[ -n "$MP_TOR" ] && AUTO_MEMPOOL_URL="https://${MP_TOR%.onion}.local"

MEMPOOL_LINK="$(read_cfg mempool-explorer-url)"
case "$MEMPOOL_LINK" in ""|"null"|"~") MEMPOOL_LINK="" ;; esac
export MEMPOOL_PUBLIC_URL="${MEMPOOL_LINK:-${AUTO_MEMPOOL_URL:-https://mempool.space}}"

# Anonymize: when on, generate+persist the key bundle once (the 0.4.x path does
# the equivalent in main.ts) so the app's startup validators are satisfied. The
# keys live on the data volume, so they are stable across restarts and captured
# by backups. The signed-registry fingerprint and public-chain-backend opt-in are
# set by the shared 040 entrypoint.
ANON_SECRETS=/data/anonymize-secrets.env
if [ "$ANON" = "true" ]; then
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
  if [ "$LIQ" = "true" ]; then
    export ANONYMIZE_LIQUID_ENABLED=true
    export ANONYMIZE_LIQUID_INTEGRATION_VERIFIED=true
    export ANONYMIZE_LIQUID_ELECTRUM_URL="tcp://elements-electrs.embassy:50001"
  else
    export ANONYMIZE_LIQUID_ENABLED=false
  fi
else
  export ANONYMIZE_ENABLED=false
  export ANONYMIZE_LIQUID_ENABLED=false
fi

exec /usr/local/bin/docker_entrypoint_040.sh
