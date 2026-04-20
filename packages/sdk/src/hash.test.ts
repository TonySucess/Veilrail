import { describe, it, expect } from "vitest";
import { commit, nullifierFor, deriveSessionRoot } from "./hash";

describe("VeilRail field hash helpers", () => {
  it("commit returns a 32-byte hex string", async () => {
    const c = await commit([1n, 2n]);
    expect(c).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("nullifier is deterministic for the same (sessionId, agentSk)", async () => {
    const a = await nullifierFor(42n, 99n);
    const b = await nullifierFor(42n, 99n);
    expect(a).toBe(b);
  });

  it("session root differs for different epochs", async () => {
    const agentCommit = BigInt(await commit([7n, 8n]));
    const r1 = await deriveSessionRoot(1n, 1n, agentCommit);
    const r2 = await deriveSessionRoot(1n, 2n, agentCommit);
    expect(r1).not.toBe(r2);
  });
});
