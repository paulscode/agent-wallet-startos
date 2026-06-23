#!/bin/bash
# Sets the static, in-image infrastructure environment (from the dynamic/secret
# values StartOS passes in), then hands off to s6-overlay (PID 1) which supervises
# Postgres + Redis + Tor + the API + the Celery worker.
#
# The dynamic values (SECRET_KEY, POSTGRES_PASSWORD, REDIS_PASSWORD, DASHBOARD_TOKEN,
# LND_*, the indexer/mempool selection, BITCOIN_NETWORK, the anonymize keys) are
# already in the environment — set by main.ts on 0.4.x, or by docker_entrypoint.sh
# on 0.3.x.
set -e

# Dashboard / API.
export API_HOST=0.0.0.0
export API_PORT="${API_PORT:-8100}"
export ENABLE_DASHBOARD=true

# In-image datastores (loopback). The loopback DB host also skips the public-host
# SSL boot gate.
export DATABASE_URL="postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5432/agent_btc_wallet"
export REDIS_URL="redis://:${REDIS_PASSWORD}@127.0.0.1:6379/0"

# Security defaults — correct behind the StartOS LAN-TLS interface. (Verify the
# Tor `.onion` http secure-context behavior for COOKIE_SECURE on the servers.)
export COOKIE_SECURE="${COOKIE_SECURE:-true}"
export ENABLE_HSTS="${ENABLE_HSTS:-true}"
# Confirm the StartOS service-network CIDR on the box; without this, dashboard
# session IP-binding silently degrades.
export TRUSTED_PROXIES="${TRUSTED_PROXIES:-172.16.0.0/12}"

# LND on StartOS serves a self-signed TLS cert. The app pins it (LND_TLS_CERT is
# read from the mounted LND volume by main.ts / the 0.3.x shim) — but it only
# *uses* the pinned cert when verification against system CAs is off. So disable
# the system-CA verification; the pinned cert (with LND's `lnd.startos` SAN) is
# what's actually trusted.
export LND_TLS_VERIFY="${LND_TLS_VERIFY:-false}"

# Chain backend: `auto` prefers the selected Electrum indexer but falls back to
# the local Mempool, so a syncing/unreachable indexer doesn't block the dashboard
# from starting. (Strict `electrum` hard-fails startup if the indexer is down.)
export CHAIN_BACKEND="${CHAIN_BACKEND:-auto}"
export MEMPOOL_ALLOW_INTERNAL=true

# Tor runs on localhost inside this image (the bundled tor service). Used for
# `.onion` egress (Boltz/operators); LND itself is reached clearnet-internally.
export ANONYMIZE_TOR_SOCKS_HOST="${ANONYMIZE_TOR_SOCKS_HOST:-127.0.0.1}"
export ANONYMIZE_TOR_CONTROL_HOST="${ANONYMIZE_TOR_CONTROL_HOST:-127.0.0.1}"
export LND_TOR_PROXY="${LND_TOR_PROXY:-socks5://127.0.0.1:9050}"

# Anonymize: the chain backend (Electrum indexer + Mempool) is a LOCAL service on
# this server (internal hostname), so its traffic never leaves the box and can't
# leak the operator's IP. Mark it trusted-local: excluded from the onion-only-
# egress gate WITHOUT a privacy-tier cap (a co-resident backend has no third-party
# observer, so it is more private than a Tor-routed public one). The gate still
# enforces .onion on the privacy-critical Boltz swap legs. The opt-in is inert
# unless every chain host is actually local, so it cannot relax a remote endpoint.
export ANONYMIZE_TRUSTED_LOCAL_CHAIN_BACKEND="${ANONYMIZE_TRUSTED_LOCAL_CHAIN_BACKEND:-true}"
# Fingerprint of the release key that signed the shipped operator registry — a
# constant baked into the app. Required when Anonymize is enabled so the signed
# registry verifies.
export ANONYMIZE_REGISTRY_RELEASE_KEY_FINGERPRINTS="${ANONYMIZE_REGISTRY_RELEASE_KEY_FINGERPRINTS:-FF76D4843EBD7FA06D92DC0CB8AB7B8E7E280E1A}"

# BOLT 12: the version layer (main.ts on 0.4.x, docker_entrypoint.sh on 0.3.x)
# sets BOLT12_GATEWAY_GRPC to the loopback gateway target when the BOLT 12 toggle
# is on, and leaves it empty when off. The bundled gateway daemon (s6 service
# `bolt12-gateway`) and the wallet's BOLT 12 runtime both gate on this value. The
# shared BOLT12_GATEWAY_TOKEN is generated alongside the other secrets.
export BOLT12_GATEWAY_GRPC="${BOLT12_GATEWAY_GRPC:-}"

# Persist the env for the s6 services (which start in a fresh environment).
mkdir -p /run/s6/container_environment
for var in $(compgen -e); do
  printf '%s' "${!var}" > "/run/s6/container_environment/${var}"
done

exec /init
