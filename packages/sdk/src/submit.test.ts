import { describe, it, expect } from "vitest";
import { buildVerifyInstruction, vkPda } from "./submit";
import { PROGRAM_IDS, VERIFIER_CIRCUIT_TAG } from "./constants";
import type { ProofBundle } from "./types";

const BN254_P =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

function toHex(u: Uint8Array): string {
  return Array.from(u)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function be32(v: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let x = v;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

// Fixture chosen so the encoding exercises every transformation:
//  - pi_a.y is non-zero and < P, so the negation P - y is observable
//  - pi_b coefficients differ between c0 and c1, so the swap is observable
//  - publicSignals length (3) is non-trivial for the u32 LE prefix
const FIXTURE: ProofBundle = {
  proof: {
    pi_a: ["1", "2", "1"],
    pi_b: [
      ["3", "4"],
      ["5", "6"],
      ["1", "0"],
    ],
    pi_c: ["7", "8", "1"],
    protocol: "groth16",
    curve: "bn128",
  },
  publicSignals: ["9", "10", "11"],
  stages: [],
  totalMs: 0,
};

// Pre-computed sha256("global:verify_auth")[0..8]. Pinning this byte-for-byte
// is the whole point: if the Anchor method name on the verifier program ever
// changes, this test must fail loudly.
const DISC_AUTH = "b8d1121142f5504c";
const DISC_COMPLETION = "76a93d9ad469ea2f";
const DISC_POOL = "eb4b67c38cf85a64";

describe("buildVerifyInstruction wire format", () => {
  it("targets the verifier program and the per-circuit vk PDA", async () => {
    const ix = await buildVerifyInstruction(FIXTURE, "auth");
    expect(ix.programId.equals(PROGRAM_IDS.verifier)).toBe(true);
    expect(ix.keys).toHaveLength(1);
    const expectedPda = vkPda(PROGRAM_IDS.verifier, VERIFIER_CIRCUIT_TAG.auth);
    expect(ix.keys[0]!.pubkey.equals(expectedPda)).toBe(true);
    expect(ix.keys[0]!.isSigner).toBe(false);
    expect(ix.keys[0]!.isWritable).toBe(false);
  });

  it("emits the expected discriminator for each circuit", async () => {
    const a = await buildVerifyInstruction(FIXTURE, "auth");
    const c = await buildVerifyInstruction(FIXTURE, "completion");
    const p = await buildVerifyInstruction(FIXTURE, "poolNote");
    expect(toHex(new Uint8Array(a.data).slice(0, 8))).toBe(DISC_AUTH);
    expect(toHex(new Uint8Array(c.data).slice(0, 8))).toBe(DISC_COMPLETION);
    expect(toHex(new Uint8Array(p.data).slice(0, 8))).toBe(DISC_POOL);
  });

  it("produces the exact byte layout expected by the on-chain verifier", async () => {
    const ix = await buildVerifyInstruction(FIXTURE, "auth");
    const data = new Uint8Array(ix.data);

    // disc(8) + A(64) + B(128) + C(64) + len(4) + 3 * 32
    expect(data.length).toBe(8 + 64 + 128 + 64 + 4 + 3 * 32);

    let off = 0;
    expect(toHex(data.slice(off, off + 8))).toBe(DISC_AUTH);
    off += 8;

    // proof_a: (x, -y) big-endian, 32 bytes each
    const expectedA = new Uint8Array(64);
    expectedA.set(be32(1n), 0);
    expectedA.set(be32((BN254_P - 2n) % BN254_P), 32);
    expect(toHex(data.slice(off, off + 64))).toBe(toHex(expectedA));
    off += 64;

    // proof_b: (x.c1, x.c0, y.c1, y.c0) — snarkjs gives [c0, c1], so the
    // bytes here must be the *second* element of each snarkjs pair first.
    const expectedB = new Uint8Array(128);
    expectedB.set(be32(4n), 0);   // x.c1 (snarkjs pi_b[0][1])
    expectedB.set(be32(3n), 32);  // x.c0 (snarkjs pi_b[0][0])
    expectedB.set(be32(6n), 64);  // y.c1 (snarkjs pi_b[1][1])
    expectedB.set(be32(5n), 96);  // y.c0 (snarkjs pi_b[1][0])
    expect(toHex(data.slice(off, off + 128))).toBe(toHex(expectedB));
    off += 128;

    // proof_c: (x, y) big-endian, NOT negated
    const expectedC = new Uint8Array(64);
    expectedC.set(be32(7n), 0);
    expectedC.set(be32(8n), 32);
    expect(toHex(data.slice(off, off + 64))).toBe(toHex(expectedC));
    off += 64;

    // u32 LE length prefix (borsh Vec)
    expect(Array.from(data.slice(off, off + 4))).toEqual([3, 0, 0, 0]);
    off += 4;

    // public signals, 32 bytes BE each
    expect(toHex(data.slice(off, off + 32))).toBe(toHex(be32(9n)));
    off += 32;
    expect(toHex(data.slice(off, off + 32))).toBe(toHex(be32(10n)));
    off += 32;
    expect(toHex(data.slice(off, off + 32))).toBe(toHex(be32(11n)));
    off += 32;

    expect(off).toBe(data.length);
  });

  it("rejects projective (non-affine) snarkjs points", async () => {
    const badA: ProofBundle = {
      ...FIXTURE,
      proof: { ...FIXTURE.proof, pi_a: ["1", "2", "2"] },
    };
    await expect(buildVerifyInstruction(badA, "auth")).rejects.toThrow(/affine pi_a/);

    const badB: ProofBundle = {
      ...FIXTURE,
      proof: {
        ...FIXTURE.proof,
        pi_b: [["3", "4"], ["5", "6"], ["1", "1"]],
      },
    };
    await expect(buildVerifyInstruction(badB, "auth")).rejects.toThrow(/affine pi_b/);

    const badC: ProofBundle = {
      ...FIXTURE,
      proof: { ...FIXTURE.proof, pi_c: ["7", "8", "2"] },
    };
    await expect(buildVerifyInstruction(badC, "auth")).rejects.toThrow(/affine pi_c/);
  });
});
