/**
 * IPFS API — decentralized file storage via Demos IPFS integration.
 *
 * Wraps @kynesyslabs/demosdk/ipfs. Provides upload (add+pin), pin
 * existing CIDs, and unpin. Files stored on IPFS via Demos network.
 *
 * Pricing: Max 2GB per content. Costs DEM based on size.
 */

import type { Demos } from "@kynesyslabs/demosdk/websdk";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface IPFSAPI {
  /** Upload content to IPFS (auto-pinned). Returns txHash on chain confirmation. */
  upload(content: string | Uint8Array, opts?: { filename?: string }): Promise<{
    ok: boolean;
    txHash?: string;
    confirmationBlock?: number;
    broadcastMessage?: string;
    error?: string;
  }>;
  /** Pin an existing CID on the Demos IPFS network. */
  pin(cid: string, opts?: { duration?: number }): Promise<{
    ok: boolean;
    txHash?: string;
    confirmationBlock?: number;
    broadcastMessage?: string;
    error?: string;
  }>;
  /** Unpin a CID. */
  unpin(cid: string): Promise<{
    ok: boolean;
    txHash?: string;
    confirmationBlock?: number;
    broadcastMessage?: string;
    error?: string;
  }>;
}

export function createIPFSAPI(demos: Demos): IPFSAPI {
  let ipfsModule: any = null;
  const require = createRequire(import.meta.url);

  async function getIPFSModule() {
    if (!ipfsModule) {
      let mod: any;
      try {
        const sdkIpfsSpecifier = "@kynesyslabs/demosdk" + "/ipfs";
        mod = await import(/* @vite-ignore */ sdkIpfsSpecifier);
      } catch (error) {
        // SDK v2.11.x ships build/ipfs but does not export ./ipfs.
        // Resolve from the package entrypoint so Node ESM can still load it.
        const message = error instanceof Error ? error.message : String(error);
        const isMissingIpfsExport =
          message.includes("./ipfs") &&
          (message.includes("not exported") || message.includes("not defined by \"exports\""));
        if (!isMissingIpfsExport) {
          throw error;
        }

        const sdkEntry = require.resolve("@kynesyslabs/demosdk");
        const fallbackEntry = resolve(dirname(sdkEntry), "ipfs", "index.js");
        mod = await import(pathToFileURL(fallbackEntry).href);
      }

      ipfsModule = mod.IPFSOperations ?? mod.default?.IPFSOperations ?? mod;
    }
    return ipfsModule;
  }

  async function submitPayload(payload: unknown): Promise<{
    ok: boolean;
    txHash?: string;
    confirmationBlock?: number;
    broadcastMessage?: string;
    error?: string;
  }> {
    try {
      const tx = await createSignedIPFSTransaction(payload);
      const confirmed = await demos.confirm(tx);
      const broadcast = await demos.broadcast(confirmed);
      const txHash = (confirmed as any)?.response?.data?.transaction?.hash ?? "pending";
      const resultCode = (broadcast as any)?.result;
      const broadcastMessage = (broadcast as any)?.response?.message;
      const confirmationBlock = (broadcast as any)?.extra?.confirmationBlock;
      if (typeof resultCode === "number" && resultCode !== 200) {
        return {
          ok: false,
          txHash,
          confirmationBlock,
          broadcastMessage,
          error: broadcastMessage ?? `Broadcast failed with result ${resultCode}`,
        };
      }
      return { ok: true, txHash, confirmationBlock, broadcastMessage };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  }

  async function createSignedIPFSTransaction(payload: unknown) {
    const runtime = demos as Demos & {
      keypair?: { publicKey?: Uint8Array | Buffer | string };
      tx?: { empty?: () => any };
      getAddressNonce?: (address: string) => Promise<number>;
      sign?: (tx: any) => Promise<any>;
    };

    if (!runtime.keypair?.publicKey) {
      throw new Error("Wallet not connected");
    }
    if (typeof runtime.tx?.empty !== "function") {
      throw new Error("Demos tx.empty() unavailable");
    }
    if (typeof runtime.getAddressNonce !== "function") {
      throw new Error("Demos getAddressNonce() unavailable");
    }
    if (typeof runtime.sign !== "function") {
      throw new Error("Demos sign() unavailable");
    }

    const from = Buffer.from(runtime.keypair.publicKey).toString("hex");
    const nonce = await runtime.getAddressNonce(from);
    const tx = runtime.tx.empty();
    tx.content.to = from;
    tx.content.nonce = nonce + 1;
    tx.content.amount = 0;
    tx.content.type = "ipfs";
    tx.content.timestamp = Date.now();
    tx.content.data = ["ipfs", payload as any];
    return runtime.sign(tx);
  }

  return {
    async upload(content, opts) {
      try {
        const IPFSOperations = await getIPFSModule();
        const payload = IPFSOperations.createAddPayload(content, { filename: opts?.filename });
        return submitPayload(payload);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    async pin(cid, opts) {
      try {
        const IPFSOperations = await getIPFSModule();
        const payload = IPFSOperations.createPinPayload(cid, { duration: opts?.duration });
        return submitPayload(payload);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    async unpin(cid) {
      try {
        const IPFSOperations = await getIPFSModule();
        const payload = IPFSOperations.createUnpinPayload(cid);
        return submitPayload(payload);
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },
  };
}
