// Real Groth16 proving for the homepage and Playground demos.
// Loads the locally-served VeilRail veil_auth circuit (.wasm + .zkey + vk.json
// under /circuits) and produces a verifiable proof.

// snarkjs is heavy (~2 MB) and only needed when the user actually clicks
// "Generate proof" — it is loaded lazily so marketing pages never pay for it.
// Poseidon comes from the tiny `poseidon-lite` package (≈30 KB), which uses
// the same BN254 round constants as circomlibjs and produces byte-identical
// hashes for the inputs the veil_auth circuit consumes.
type SnarkJs = {
  groth16: {
    fullProve: (
      input: Record<string, string>,
      wasm: string,
      zkey: string,
    ) => Promise<{ proof: ProofOutput["rawProof"]; publicSignals: string[] }>;
    verify: (vk: unknown, signals: string[], proof: ProofOutput["rawProof"]) => Promise<boolean>;
  };
};

let _snarkjs: SnarkJs | null = null;
async function getSnarkjs(): Promise<SnarkJs> {
  if (_snarkjs) return _snarkjs;
  // @ts-expect-error - snarkjs ships no types
  const mod = await import("snarkjs");
  _snarkjs = (mod.default ?? mod) as SnarkJs;
  return _snarkjs;
}

export interface ProofStage {
  name: string;
  durationMs: number;
}

export interface ProofOutput {
  proofA: string;
  proofB: string;
  proofC: string;
  publicSignals: string[];
  commitment: string;
  nullifierHash: string;
  elapsedMs: number;
  verified: boolean;
  /** Raw snarkjs proof — needed by the SDK to construct the verifier
   *  instruction. Kept as the loose shape snarkjs returns. */
  rawProof: {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
    protocol: "groth16";
    curve: "bn128";
  };
  /** Decimal-string public signals exactly as snarkjs returned them.
   *  Required to feed the on-chain verifier (which expects 32-byte BE
   *  encodings of these field elements). */
  rawPublicSignals: string[];
}

const ARTIFACT_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/circuits`;
const WASM_URL = `${ARTIFACT_BASE}/veil_auth.wasm`;
const ZKEY_URL = `${ARTIFACT_BASE}/veil_auth_final.zkey`;
const VK_URL = `${ARTIFACT_BASE}/veil_auth_vk.json`;

type PoseidonFn = (inputs: bigint[]) => bigint;
let _poseidon: PoseidonFn | null = null;
async function getPoseidon(): Promise<PoseidonFn> {
  if (_poseidon) return _poseidon;
  const [{ poseidon2 }, { poseidon3 }] = await Promise.all([
    import("poseidon-lite/poseidon2"),
    import("poseidon-lite/poseidon3"),
  ]);
  _poseidon = (inputs: bigint[]): bigint => {
    if (inputs.length === 2) return poseidon2(inputs);
    if (inputs.length === 3) return poseidon3(inputs);
    throw new Error(`demoProof: unsupported Poseidon arity ${inputs.length}`);
  };
  return _poseidon;
}

let _vk: unknown | null = null;
async function getVk(): Promise<unknown> {
  if (_vk) return _vk;
  const r = await fetch(VK_URL);
  if (!r.ok) throw new Error(`Failed to load verification key (${r.status})`);
  _vk = await r.json();
  return _vk;
}

function hex32(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

function deriveSecrets(agentId: string, sessionAmount: number) {
  const enc = new TextEncoder().encode(agentId);
  let h = 0xcbf29ce484222325n;
  for (const b of enc) {
    h ^= BigInt(b);
    h = (h * 0x100000001b3n) & ((1n << 254n) - 1n);
  }
  return {
    agentSk: h | 1n,
    agentSalt: (h ^ 0x5a17deadbeefn) | 1n,
    peerPubKey: 0x1f1e1d1c1b1a19181716151413121110n,
    peerSalt: 0x9988776655443322n,
    sessionId: ((h * 31n) ^ BigInt(Math.floor(Date.now() / 1000))) & ((1n << 200n) - 1n),
    registryEpoch: 1n,
    maxNotional: BigInt(Math.max(1, Math.floor(sessionAmount))),
  };
}

export async function generateDemoProof(
  input: { agentId: string; sessionAmount: number },
  onProgress?: (stage: string, elapsedMs: number, hex: string) => void,
): Promise<ProofOutput> {
  const start = performance.now();
  const stages: ProofStage[] = [];

  const tick = (name: string, since: number, hex = "") => {
    const ms = Math.round(performance.now() - since);
    stages.push({ name, durationMs: ms });
    if (onProgress) onProgress(name, Math.round(performance.now() - start), hex);
  };

  // 1. Poseidon
  let t = performance.now();
  const poseidon = await getPoseidon();
  tick("Poseidon initialization", t);

  // 2. Witness inputs
  t = performance.now();
  const s = deriveSecrets(input.agentId, input.sessionAmount);
  const agentCommitment = poseidon([s.agentSk, s.agentSalt]);
  const peerCommitment = poseidon([s.peerPubKey, s.peerSalt]);
  const sessionRoot = poseidon([s.sessionId, s.registryEpoch, agentCommitment]);
  const nullifierHash = poseidon([s.sessionId, s.agentSk]);
  tick("Witness derivation", t, hex32(sessionRoot).slice(0, 32));

  const witnessInputs = {
    sessionRoot: sessionRoot.toString(),
    peerCommitment: peerCommitment.toString(),
    maxNotional: s.maxNotional.toString(),
    epoch: s.registryEpoch.toString(),
    agentSk: s.agentSk.toString(),
    agentSalt: s.agentSalt.toString(),
    peerPubKey: s.peerPubKey.toString(),
    peerSalt: s.peerSalt.toString(),
    sessionId: s.sessionId.toString(),
    registryEpoch: s.registryEpoch.toString(),
  };

  // 3. Groth16 fullProve (witness gen + proving in one call)
  t = performance.now();
  const snarkjs = await getSnarkjs();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    witnessInputs,
    WASM_URL,
    ZKEY_URL,
  );
  tick("Groth16 fullProve", t);

  // 4. Verify locally against the exported VK so the UI badge is meaningful.
  t = performance.now();
  let verified = false;
  try {
    const vk = await getVk();
    const sj = await getSnarkjs();
    verified = await sj.groth16.verify(vk, publicSignals, proof);
  } catch (err) {
    console.error("Local verification failed", err);
  }
  tick("Local verification", t);

  const proofA = `${BigInt(proof.pi_a[0]).toString(16).padStart(64, "0")}${BigInt(proof.pi_a[1]).toString(16).padStart(64, "0")}`;
  const proofB = proof.pi_b
    .slice(0, 2)
    .flat()
    .map((x: string) => BigInt(x).toString(16).padStart(64, "0"))
    .join("");
  const proofC = `${BigInt(proof.pi_c[0]).toString(16).padStart(64, "0")}${BigInt(proof.pi_c[1]).toString(16).padStart(64, "0")}`;

  return {
    proofA,
    proofB,
    proofC,
    publicSignals: publicSignals.map((x: string) => BigInt(x).toString(16).padStart(64, "0")),
    commitment: hex32(sessionRoot),
    nullifierHash: hex32(nullifierHash),
    elapsedMs: Math.round(performance.now() - start),
    verified,
    rawProof: proof,
    rawPublicSignals: publicSignals,
  };
}
