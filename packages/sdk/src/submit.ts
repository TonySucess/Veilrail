import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import type { CircuitName, ProofBundle, WalletLike } from "./types";
import { PROGRAM_IDS, VERIFIER_CIRCUIT_TAG } from "./constants";

/**
 * Browser-side broadcaster for VeilRail Groth16 proofs.
 *
 * We construct the verifier instruction by hand instead of pulling in
 * `@coral-xyz/anchor`'s IDL machinery so the SDK stays under the SPA's
 * existing JavaScript budget. The wire format mirrors the Rust program
 * exactly:
 *
 *   discriminator (8) || proof_a (64) || proof_b (128) || proof_c (64)
 *     || u32_le(public_inputs.len) || public_inputs[..] (32 each, BE)
 *
 * G1 affine encoding is big-endian `(x, y)`. G2 affine encoding follows
 * Solana's `alt_bn128` syscall convention: `(x.c1, x.c0, y.c1, y.c0)`,
 * each 32 bytes BE — the imaginary coefficient comes first. proof_a is
 * negated before serialization so the on-chain pairing check
 * `e(-A, B) * e(α, β) * e(L, γ) * e(C, δ) == 1` lines up with the
 * standard snarkjs proof shape.
 */

const BN254_BASE_PRIME =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

const METHOD_NAME: Record<CircuitName, string> = {
  auth: "verify_auth",
  completion: "verify_completion",
  poolNote: "verify_pool",
};

const _discCache = new Map<string, Uint8Array>();

async function discriminator(method: string): Promise<Uint8Array> {
  const cached = _discCache.get(method);
  if (cached) return cached;
  const bytes = new TextEncoder().encode(`global:${method}`);
  const digest = await getSubtle().digest("SHA-256", bytes);
  const out = new Uint8Array(digest).slice(0, 8);
  _discCache.set(method, out);
  return out;
}

function getSubtle(): SubtleCrypto {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error("VeilRail.submit requires Web Crypto (crypto.subtle)");
  return c.subtle;
}

function bigintTo32BE(value: bigint): Uint8Array {
  if (value < 0n) throw new Error("negative field element");
  const out = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n) throw new Error("field element overflows 32 bytes");
  return out;
}

function decimalTo32BE(s: string): Uint8Array {
  return bigintTo32BE(BigInt(s));
}

function negateG1Y(yDec: string): Uint8Array {
  const y = BigInt(yDec) % BN254_BASE_PRIME;
  const neg = (BN254_BASE_PRIME - y) % BN254_BASE_PRIME;
  return bigintTo32BE(neg);
}

function encodeProofA(piA: [string, string, string]): Uint8Array {
  // snarkjs returns projective [x, y, 1]; require z == "1".
  if (piA[2] !== "1") throw new Error("expected affine pi_a (z=1)");
  const out = new Uint8Array(64);
  out.set(decimalTo32BE(piA[0]), 0);
  out.set(negateG1Y(piA[1]), 32);
  return out;
}

function encodeProofB(
  piB: [[string, string], [string, string], [string, string]],
): Uint8Array {
  if (piB[2][0] !== "1" || piB[2][1] !== "0") {
    throw new Error("expected affine pi_b (z=[1,0])");
  }
  const out = new Uint8Array(128);
  // snarkjs is [c0, c1]; on-chain expects c1 then c0.
  out.set(decimalTo32BE(piB[0][1]), 0);   // x.c1
  out.set(decimalTo32BE(piB[0][0]), 32);  // x.c0
  out.set(decimalTo32BE(piB[1][1]), 64);  // y.c1
  out.set(decimalTo32BE(piB[1][0]), 96);  // y.c0
  return out;
}

function encodeProofC(piC: [string, string, string]): Uint8Array {
  if (piC[2] !== "1") throw new Error("expected affine pi_c (z=1)");
  const out = new Uint8Array(64);
  out.set(decimalTo32BE(piC[0]), 0);
  out.set(decimalTo32BE(piC[1]), 32);
  return out;
}

export function vkPda(programId: PublicKey, tag: number): PublicKey {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("vk"), Uint8Array.from([tag])],
    programId,
  )[0];
}

export async function buildVerifyInstruction(
  bundle: ProofBundle,
  circuit: CircuitName,
): Promise<TransactionInstruction> {
  const tag = VERIFIER_CIRCUIT_TAG[circuit];
  const disc = await discriminator(METHOD_NAME[circuit]);
  const a = encodeProofA(bundle.proof.pi_a);
  const b = encodeProofB(bundle.proof.pi_b);
  const c = encodeProofC(bundle.proof.pi_c);

  const inputs = bundle.publicSignals.map(decimalTo32BE);
  const len = inputs.length;
  const dataLen = 8 + 64 + 128 + 64 + 4 + 32 * len;
  const data = new Uint8Array(dataLen);
  let off = 0;
  data.set(disc, off); off += 8;
  data.set(a, off); off += 64;
  data.set(b, off); off += 128;
  data.set(c, off); off += 64;
  // u32 LE length prefix for borsh Vec
  data[off++] = len & 0xff;
  data[off++] = (len >> 8) & 0xff;
  data[off++] = (len >> 16) & 0xff;
  data[off++] = (len >> 24) & 0xff;
  for (const inp of inputs) { data.set(inp, off); off += 32; }

  // Buffer is provided by Solana's web3 stack (browser bundles polyfill it).
  const BufferCtor = (globalThis as unknown as { Buffer?: { from(u: Uint8Array): unknown } }).Buffer;
  const dataBuf = (BufferCtor ? BufferCtor.from(data) : data) as Buffer;

  return new TransactionInstruction({
    programId: PROGRAM_IDS.verifier,
    keys: [{ pubkey: vkPda(PROGRAM_IDS.verifier, tag), isSigner: false, isWritable: false }],
    data: dataBuf,
  });
}

export async function submitProof(
  connection: Connection,
  wallet: WalletLike,
  bundle: ProofBundle,
  circuit?: CircuitName,
): Promise<string> {
  if (!wallet.publicKey) throw new Error("wallet not connected");
  const which = circuit ?? bundle.circuit;
  if (!which) {
    throw new Error(
      "ProofBundle.circuit is missing; pass `circuit` explicitly or generate the proof via the SDK helpers which set it.",
    );
  }
  const ix = await buildVerifyInstruction(bundle, which);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const tx = new Transaction({ feePayer: wallet.publicKey, blockhash, lastValidBlockHeight });
  tx.add(ix);
  const signed = await wallet.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  return sig;
}
