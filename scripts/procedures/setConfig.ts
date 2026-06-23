import { compat, types as T } from "../deps.ts";

// Maps the selected config to conditional dependencies: LND is always required;
// exactly one indexer and one Mempool flavor become required by the selection;
// the Liquid Electrum backend (gated on its index-sync) is required only when the
// Liquid hop is enabled.
export const setConfig: T.ExpectedExports.setConfig = async (
  effects: T.Effects,
  newConfig: T.Config,
) => {
  const cfg = newConfig as Record<string, unknown>;
  const indexer = cfg["indexer"];
  // `mempool` is a union: its selected flavor is the union tag, not the value
  // itself. Read the tag (and tolerate a plain string for safety).
  const mempoolUnion = cfg["mempool"];
  const mempool =
    mempoolUnion && typeof mempoolUnion === "object"
      ? (mempoolUnion as Record<string, unknown>)["type"]
      : mempoolUnion;
  const liquid = cfg["liquid"];

  // LND is always required; the selected indexer / Mempool flavor each add their
  // package; the Liquid backend (gated on its index-sync) only when enabled.
  const dependsOn: Record<string, string[]> = { lnd: [] };
  if (indexer === "electrs") dependsOn["electrs"] = [];
  else if (indexer === "fulcrum") dependsOn["fulcrum"] = [];
  if (mempool === "mempool") dependsOn["mempool"] = [];
  else if (mempool === "mempool-rdts") dependsOn["mempool-rdts"] = [];
  if (liquid === true) dependsOn["elements-electrs"] = ["index-sync"];

  return compat.setConfig(effects, newConfig, dependsOn);
};
