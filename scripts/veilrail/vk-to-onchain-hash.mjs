#!/usr/bin/env node
// Convert a snarkjs verification_key.json (Groth16, BN254) into the
// concatenated binary VK that veil-verifier's `upload_vk` instruction
// stores on-chain, and print sha256 of those bytes.
//
// On-chain layout (matches packages/programs/programs/veil-verifier/src/lib.rs):
//   alpha_g1  (G1, 64 bytes)
//   beta_g2   (G2, 128 bytes)
//   gamma_g2  (G2, 128 bytes)
//   delta_g2  (G2, 128 bytes)
//   ic[i]     (G1, 64 bytes each, for i = 0..nPublic)
//
// G1 encoding (Solana alt_bn128 syscall): big-endian x || y, 32 bytes each.
// G2 encoding: x.c1 || x.c0 || y.c1 || y.c0, 32 bytes each (imaginary first).
//
// Usage: node scripts/veilrail/vk-to-onchain-hash.mjs <vk.json> [<vk.json> ...]

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

function fieldBE(s) {
  // 32-byte big-endian encoding of a decimal string field element.
  let n = BigInt(s);
  if (n < 0n) throw new Error(`negative field element: ${s}`);
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  if (n !== 0n) throw new Error(`field element overflows 32 bytes: ${s}`);
  return out;
}

function g1ToBytes(p) {
  // p = [x, y, z] decimal strings; require z == "1" (affine).
  if (p.length !== 3 || p[2] !== "1") {
    throw new Error(`expected affine G1 with z=1, got ${JSON.stringify(p)}`);
  }
  const out = new Uint8Array(64);
  out.set(fieldBE(p[0]), 0);
  out.set(fieldBE(p[1]), 32);
  return out;
}

function g2ToBytes(p) {
  // p = [[x.c0, x.c1], [y.c0, y.c1], [z.c0, z.c1]]; require z == [1, 0].
  if (p.length !== 3 || p[2][0] !== "1" || p[2][1] !== "0") {
    throw new Error(`expected affine G2 with z=[1,0], got ${JSON.stringify(p)}`);
  }
  // Solana alt_bn128 syscall G2 ordering: imaginary then real, x then y.
  const out = new Uint8Array(128);
  out.set(fieldBE(p[0][1]), 0);    // x.c1
  out.set(fieldBE(p[0][0]), 32);   // x.c0
  out.set(fieldBE(p[1][1]), 64);   // y.c1
  out.set(fieldBE(p[1][0]), 96);   // y.c0
  return out;
}

export function vkToOnChainBytes(vk) {
  if (vk.protocol !== "groth16" || vk.curve !== "bn128") {
    throw new Error(`unsupported vk: ${vk.protocol}/${vk.curve}`);
  }
  const parts = [
    g1ToBytes(vk.vk_alpha_1),
    g2ToBytes(vk.vk_beta_2),
    g2ToBytes(vk.vk_gamma_2),
    g2ToBytes(vk.vk_delta_2),
  ];
  for (const ic of vk.IC) parts.push(g1ToBytes(ic));
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export function vkOnChainSha256(vk) {
  const bytes = vkToOnChainBytes(vk);
  return createHash("sha256").update(bytes).digest("hex");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error("usage: vk-to-onchain-hash.mjs <vk.json> [...]");
    process.exit(1);
  }
  for (const f of files) {
    const vk = JSON.parse(readFileSync(f, "utf8"));
    const bytes = vkToOnChainBytes(vk);
    const hash = createHash("sha256").update(bytes).digest("hex");
    console.log(`${f}\t${bytes.length}\t${hash}`);
  }
}
