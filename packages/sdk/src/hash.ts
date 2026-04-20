/**
 * Field-element helpers backed by circomlibjs Poseidon.
 *
 * All inputs are converted to bigints in the BN254 scalar field. The
 * resulting commitments match the circuit constraints byte-for-byte.
 */

// Poseidon is loaded lazily from `poseidon-lite` (≈30 KB, BN254 round
// constants identical to circomlibjs) so the SDK adds almost nothing to a
// consumer's bundle when only on-chain helpers are used.
type Poseidon = (inputs: bigint[]) => Uint8Array;
let _poseidon: Poseidon | null = null;

function bigintToBE32(n: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let x = n;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

async function getPoseidon(): Promise<Poseidon> {
  if (_poseidon) return _poseidon;
  const [{ poseidon2 }, { poseidon3 }, { poseidon4 }] = await Promise.all([
    import("poseidon-lite/poseidon2"),
    import("poseidon-lite/poseidon3"),
    import("poseidon-lite/poseidon4"),
  ]);
  _poseidon = ((inputs: bigint[]) => {
    let h: bigint;
    if (inputs.length === 2) h = poseidon2(inputs);
    else if (inputs.length === 3) h = poseidon3(inputs);
    else if (inputs.length === 4) h = poseidon4(inputs);
    else throw new Error(`VeilRail SDK: unsupported Poseidon arity ${inputs.length}`);
    return bigintToBE32(h);
  }) as Poseidon;
  return _poseidon;
}

export function toFieldHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function commit(inputs: bigint[]): Promise<string> {
  const p = await getPoseidon();
  return toFieldHex(p(inputs));
}

export async function nullifierFor(sessionId: bigint, agentSk: bigint): Promise<string> {
  return commit([sessionId, agentSk]);
}

export async function deriveSessionRoot(
  sessionId: bigint,
  registryEpoch: bigint,
  agentCommitment: bigint,
): Promise<string> {
  return commit([sessionId, registryEpoch, agentCommitment]);
}
