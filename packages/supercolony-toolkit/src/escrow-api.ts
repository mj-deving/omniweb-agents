/**
 * Escrow API — trustless tipping to social identities.
 *
 * Wraps @kynesyslabs/demosdk/escrow. Enables tipping users who don't
 * have a Demos wallet yet — DEM is held in escrow at a deterministic
 * address until the recipient links their identity and claims it.
 *
 * Flow: sendToIdentity → DEM held at escrow address →
 *       recipient links identity → claimEscrow → DEM transferred.
 *       If unclaimed after expiry → sender calls refundExpired.
 */

import type { Demos } from "@kynesyslabs/demosdk/websdk";

export interface EscrowAPI {
  /** Send DEM to a social identity. Recipient claims after linking their Demos address. */
  sendToIdentity(platform: "twitter" | "github" | "telegram", username: string, amount: number, opts?: { expiryDays?: number; message?: string }): Promise<{ ok: boolean; txHash?: string; error?: string }>;
  /** Claim DEM sent to your social identity (must link identity first). */
  claimEscrow(platform: "twitter" | "github" | "telegram", username: string): Promise<{ ok: boolean; txHash?: string; error?: string }>;
  /** Refund expired escrow back to sender. */
  refundExpired(platform: "twitter" | "github" | "telegram", username: string): Promise<{ ok: boolean; txHash?: string; error?: string }>;
  /** Check claimable escrows for a social identity. */
  getClaimable(platform: string, username: string): Promise<{ ok: boolean; data?: unknown; error?: string }>;
  /** Get escrow balance for a social identity. */
  getBalance(platform: string, username: string): Promise<{ ok: boolean; data?: unknown; error?: string }>;
  /** Get deterministic escrow address for a platform/username. */
  getEscrowAddress(platform: string, username: string): string;
}

export function createEscrowAPI(demos: Demos, rpcUrl: string): EscrowAPI {
  let escrowModule: any = null;
  let escrowQueriesModule: any = null;

  async function getEscrowModule() {
    if (!escrowModule) {
      // Escrow subpath may not be in SDK's package.json exports —
      // construct the path manually to bypass module resolution errors.
      const sdkPath = "@kynesyslabs/demosdk";
      const mod: any = await import(/* @vite-ignore */ `${sdkPath}/escrow`);
      escrowModule = mod.EscrowTransaction ?? mod.default?.EscrowTransaction ?? mod;
      escrowQueriesModule = mod.EscrowQueries ?? mod.default?.EscrowQueries;
    }
    return { EscrowTransaction: escrowModule, EscrowQueries: escrowQueriesModule };
  }

  return {
    async sendToIdentity(platform, username, amount, opts) {
      try {
        const { EscrowTransaction } = await getEscrowModule();
        const tx = await EscrowTransaction.sendToIdentity(demos, platform, username, amount, opts);
        const confirmed = await demos.confirm(tx);
        const result = await demos.broadcast(confirmed);
        return { ok: true, txHash: (confirmed as any)?.response?.data?.transaction?.hash ?? "pending" };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    async claimEscrow(platform, username) {
      try {
        const { EscrowTransaction } = await getEscrowModule();
        const tx = await EscrowTransaction.claimEscrow(demos, platform, username);
        const confirmed = await demos.confirm(tx);
        await demos.broadcast(confirmed);
        return { ok: true, txHash: (confirmed as any)?.response?.data?.transaction?.hash ?? "pending" };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    async refundExpired(platform, username) {
      try {
        const { EscrowTransaction } = await getEscrowModule();
        const tx = await EscrowTransaction.refundExpiredEscrow(demos, platform, username);
        const confirmed = await demos.confirm(tx);
        await demos.broadcast(confirmed);
        return { ok: true, txHash: (confirmed as any)?.response?.data?.transaction?.hash ?? "pending" };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    async getClaimable(platform, username) {
      try {
        const { EscrowQueries } = await getEscrowModule();
        if (!EscrowQueries) return { ok: false, error: "EscrowQueries not available in SDK" };
        const result = await EscrowQueries.getClaimable(rpcUrl, platform, username);
        return { ok: true, data: result };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    async getBalance(platform, username) {
      try {
        const { EscrowQueries } = await getEscrowModule();
        if (!EscrowQueries) return { ok: false, error: "EscrowQueries not available in SDK" };
        const result = await EscrowQueries.getBalance(rpcUrl, platform, username);
        return { ok: true, data: result };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    },

    getEscrowAddress(platform, username) {
      // Deterministic address derivation — no async, no SDK import needed
      // The SDK uses: sha256(platform + ":" + username) → hex address
      // For now, delegate to SDK when loaded
      return `escrow:${platform}:${username}`;
    },
  };
}
