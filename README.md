# agent-wallet-startos

A StartOS service package for **Agent Wallet** — a self-custodial Bitcoin & Lightning wallet that connects to your own LND node and exposes a dashboard plus an automation API for AI agents.

This is the **wrapper** repo; the application itself lives at
[paulscode/agent-wallet](https://github.com/paulscode/agent-wallet) and its native
`docker-compose` deployment is unchanged by this package.

> ⚠️ Agent Wallet can move real funds and is designed to let AI agents initiate
> payments within configured limits. Anyone with the dashboard password or an
> issued API key can spend from the connected node. Treat those like hot-wallet keys.

## What it bundles

The package runs the app's multi-process stack in one image under **s6-overlay**:
PostgreSQL, Redis, Tor, the FastAPI dashboard/API, the Celery worker, and a
bare-LDK BOLT 12 onion-message gateway (for publishing offers / receiving
payouts). It integrates with installed StartOS services as prerequisites:

- **LND** (always) — over REST, using the cert + macaroon from LND's mounted volume.
- **One indexer** — Electrs *or* Fulcrum (selected in config).
- **One Mempool explorer** — official `mempool` *or* `mempool-rdts` (selected in config).
- **elements-electrs** (the Liquid Electrum Server) — only when the experimental
  Liquid hop in Anonymize is enabled.

## Supported StartOS versions

Two packages from one source tree (see `Makefile`):

- `agent-wallet-040.s9pk` — StartOS **0.4.x** (start-sdk; sources in `startos/`).
- `agent-wallet-0351.s9pk` — StartOS **0.3.5.x** (Embassy; `manifest.yaml` + `scripts/`).

## Building

Prerequisites: `start-cli`, `start-sdk`, `docker buildx`, Node.js/`npm`, `deno`
(0.3.x), `yq`, `jq`.

The wrapper image is built `FROM` two images published from the app repo (the
same binaries native users run):

- `paulscode/agent-wallet` — the application; Postgres/Redis/Tor are layered on
  top under s6-overlay.
- `paulscode/agent-wallet-bolt12-gateway` — the bare-LDK BOLT 12 gateway binary,
  copied into the image.

`start-cli`'s buildx pulls both from the registry, so they must be **pushed** (a
local-only image isn't visible to its builder). Build both multi-arch from the
app repo:

```
docker buildx build --platform linux/amd64,linux/arm64 \
  -t paulscode/agent-wallet:edge --push .
docker buildx build --platform linux/amd64,linux/arm64 \
  -f Dockerfile.gateway -t paulscode/agent-wallet-bolt12-gateway:edge --push .
```

Releases pin both images **by digest** in the `Dockerfile` (`APP_IMAGE` /
`GATEWAY_IMAGE`) so an install is reproducible from a fixed, tested image set; a
dev build can override them, e.g. `--build-arg APP_IMAGE=paulscode/agent-wallet:edge`.

| Command | Result |
|---------|--------|
| `make 040-x86_64` | 0.4.0, x86_64 — the fast dev loop |
| `make 0351-x86_64` | 0.3.5.1, x86_64 |
| `make release` | both universal (x86_64 + aarch64) packages → `builds/<version>/` + `SHA256SUMS` |
| `make install-040-x86_64` | install the matching build to your StartOS server |
| `make clean` | remove build artifacts |

## Releases

Built artifacts — the universal (`x86_64` + `aarch64`) `.s9pk`s plus
`SHA256SUMS` — are attached to each tagged
[GitHub Release](https://github.com/paulscode/agent-wallet-startos/releases).
The released packages pin the base and gateway images by digest, so an install
is reproducible from a fixed, tested set of images.

## License

MIT — see [LICENSE](LICENSE).
