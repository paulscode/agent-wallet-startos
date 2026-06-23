import { compat, types as T } from "../deps.ts";

// User-facing config. Keys are read by docker_entrypoint.sh from
// start9/config.yaml (flat scalars, so the shim can parse without yq). The
// dashboard password is seeded with a random value on install.
export const getConfig: T.ExpectedExports.getConfig = compat.getConfig({
  // 0.3.x defaults to Electrs — it is featured in the 0.3.5.1 official-marketplace
  // Bitcoin section, so most 0.3.5.1 users run it. (The 0.4.x package defaults to
  // Fulcrum, which is featured in the 0.4 marketplace.) The version defaults differ
  // on purpose.
  "indexer": {
    "type": "enum",
    "name": "Indexer",
    "description":
      "The Electrum indexer the wallet uses for on-chain lookups. The selected one must be installed.",
    "values": ["electrs", "fulcrum"],
    "value-names": {
      "electrs": "Electrs",
      "fulcrum": "Fulcrum",
    },
    "default": "electrs",
  },
  // Mempool selection as a UNION so the per-variant Tor-address pointer is only
  // active for the chosen explorer. Only the selected variant's package is
  // referenced, so the unselected Mempool app does NOT become a dependency.
  // The entrypoint reads the union tag (the selection) and the resolved
  // tor-address from the active variant, and derives the user-reachable .local
  // link from it.
  "mempool": {
    "type": "union",
    "name": "Mempool Explorer",
    "description":
      "Which installed Mempool explorer the wallet links to and queries. The selected one must be installed.",
    "tag": {
      "id": "type",
      "name": "Mempool Explorer",
      "description":
        "Which installed Mempool explorer the wallet links to and queries. The selected one must be installed.",
      "variant-names": {
        "mempool-rdts": "Mempool BIP-110 / RDTS",
        "mempool": "Mempool (official)",
      },
    },
    "default": "mempool-rdts",
    "variants": {
      "mempool-rdts": {
        "tor-address": {
          "name": "Detected Tor Address",
          "description": "Automatically detected from the selected Mempool service; used to build dashboard explorer links. No need to edit.",
          "type": "pointer",
          "subtype": "package",
          "package-id": "mempool-rdts",
          "target": "tor-address",
          "interface": "main",
        },
      },
      "mempool": {
        "tor-address": {
          "name": "Detected Tor Address",
          "description": "Automatically detected from the selected Mempool service; used to build dashboard explorer links. No need to edit.",
          "type": "pointer",
          "subtype": "package",
          "package-id": "mempool",
          "target": "tor-address",
          "interface": "main",
        },
      },
    },
  },
  "mempool-explorer-url": {
    "type": "string",
    "name": "Mempool Explorer URL (for links)",
    "description":
      "Normally leave this blank. The dashboard's clickable transaction / address links then point at your installed Mempool service's own address, detected automatically. Enter a URL here only to override that with a specific explorer — for example its .onion, or the public https://mempool.space.",
    "placeholder": "Leave blank to use your installed Mempool",
    "nullable": true,
  },
  "dashboard-password": {
    "type": "string",
    "name": "Dashboard Password",
    "description":
      "The password to log in to the dashboard. Copy it to log in, or change it here. Treat it like a hot-wallet key.",
    "nullable": false,
    "masked": true,
    "default": { "charset": "a-z,A-Z,0-9", "len": 32 },
  },
  "braiins-deposit": {
    "type": "boolean",
    "name": "Enable Braiins / Pool Deposit",
    "description":
      "Show the Braiins Deposit tab in the dashboard, for funding a Braiins / Ocean / Datum mining payout address from your wallet. Turn off to hide the tab if you don't mine.",
    "default": true,
  },
  "bolt12": {
    "type": "boolean",
    "name": "Enable BOLT 12 Offers",
    "description":
      "Run the bundled BOLT 12 onion-message gateway so the wallet can publish offers and receive payouts (for example from Ocean). Turn off if you only use the dashboard / agent API and want to save the gateway's resources.",
    "default": true,
  },
  "anonymize": {
    "type": "boolean",
    "name": "Enable Anonymize (Experimental)",
    "description":
      "Experimental privacy feature. Needs the bundled Tor; the app verifies a signed operator registry and enforces onion-only egress at startup.",
    "default": false,
    "warning":
      "EXPERIMENTAL. Routes funds through extra hops. Leave off unless you understand the trade-offs.",
  },
  "liquid": {
    "type": "boolean",
    "name": "Use Liquid Hop in Anonymize (Experimental)",
    "description":
      "Adds a Liquid hop to Anonymize. Requires installing the separate Liquid Electrum Server (elements-electrs) package.",
    "default": false,
    "warning":
      "EXPERIMENTAL. The Liquid Electrum Server needs ~115 GB disk and ~14 GiB RAM during its initial sync; run it on a host with at least 32 GB total RAM.",
  },
  "log-level": {
    "type": "enum",
    "name": "Log Level",
    "description": "Log verbosity. Less is usually better.",
    "values": ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"],
    "value-names": {
      "ERROR": "Error",
      "WARN": "Warning",
      "INFO": "Info",
      "DEBUG": "Debug",
      "TRACE": "Trace",
    },
    "default": "INFO",
  },
});
