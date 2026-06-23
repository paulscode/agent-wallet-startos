# Agent Wallet

Agent Wallet is a self-custodial Bitcoin and Lightning wallet that connects to your
own LND node. It provides a web dashboard and a programmatic API designed to let AI
agents initiate payments within limits you configure.

## ⚠️ Read this first — custody risk

This wallet can move **real** Bitcoin and Lightning funds. **Anyone or anything
with the dashboard password — or an issued API key — can spend from your connected
LND node, up to its rate limits.** Treat the dashboard password like a hot-wallet
key. You are responsible for your funds.

## Prerequisites

Install these StartOS services first:

- **LND** — required. Agent Wallet connects to it over its REST API.
- **An Electrum indexer** — **Electrs** *or* **Fulcrum**. Pick one in the config;
  it must be installed and synced.
- **A Mempool explorer** — **Mempool** *or* **Mempool BIP-110 / RDTS**. Pick one in
  the config; it must be installed.

## First use

1. Set your prerequisites and preferences in **Config**.
2. Start the service. First boot initializes the database and runs migrations — give
   it a few minutes.
3. Open **Properties → Dashboard Password** (or the Configure action) to copy your
   login password, then launch the UI and log in.

The dashboard is served at `/dashboard/`; "Launch UI" takes you there.

## The Anonymize feature (experimental)

Anonymize is an **experimental** privacy feature, off by default. Enabling it
generates additional keys and routes funds through extra hops, and the app enforces
onion-only egress at startup.

The **Liquid hop** is an optional add-on within Anonymize. It requires installing the
separate **Liquid Electrum Server** package, which is heavyweight: roughly **115 GB of
disk** and **~14 GiB of RAM** during its initial sync. Run it only on a server with
ample resources (≥32 GB total RAM recommended alongside your other services).

## Backups

Back up this service regularly. The backup includes the database **and** the
encryption keys that protect it — without them a restore cannot decrypt your data.
