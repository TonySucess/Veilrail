import type {
  AuthProofInput,
  CompletionProofInput,
  PoolNoteProofInput,
  ProofBundle,
  CircuitName,
} from "./types";
import { DEFAULT_CIRCUIT_ARTIFACTS } from "./constants";

type ArtifactPair = { wasm: string; zkey: string };
type ArtifactOverrides = Partial<Record<CircuitName, ArtifactPair>>;

function pickArtifacts(name: CircuitName, overrides?: ArtifactOverrides): ArtifactPair {
  return overrides?.[name] ?? DEFAULT_CIRCUIT_ARTIFACTS[name];
}

type Poseidon = (inputs: bigint[]) => bigint;
let _poseidon: Poseidon | null = null;

async function getPoseidon(): Promise<Poseidon> {
  if (_poseidon) return _poseidon;
  const [{ poseidon2 }, { poseidon3 }, { poseidon4 }] = await Promise.all([
    import("poseidon-lite/poseidon2"),
    import("poseidon-lite/poseidon3"),
    import("poseidon-lite/poseidon4"),
  ]);
  _poseidon = ((inputs: bigint[]) => {
    if (inputs.length === 2) return poseidon2(inputs);
    if (inputs.length === 3) return poseidon3(inputs);
    if (inputs.length === 4) return poseidon4(inputs);
    throw new Error(`VeilRail SDK: unsupported Poseidon arity ${inputs.length}`);
  }) as Poseidon;
  return _poseidon;
}

async function fullProve(
  input: Record<string, unknown>,
  name: CircuitName,
  overrides?: ArtifactOverrides,
): Promise<ProofBundle> {
  const { wasm, zkey } = pickArtifacts(name, overrides);
  // @ts-expect-error - snarkjs ships its own loose types
  const snarkjs = await import("snarkjs");
  const stages: { name: string; ms: number }[] = [];

  const start = performance.now();
  const wstart = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasm, zkey);
  stages.push({ name: "groth16.fullProve", ms: performance.now() - wstart });

  return {
    proof,
    publicSignals,
    circuit: name,
    stages,
    totalMs: performance.now() - start,
  };
}

export async function generateAuthProof(
  input: AuthProofInput,
  overrides?: ArtifactOverrides,
): Promise<ProofBundle> {
  const p = await getPoseidon();
  const agentCommitment = p([input.agentSk, input.agentSalt]);
  const sessionRoot = p([input.sessionId, input.registryEpoch, agentCommitment]);
  const peerCommitment = p([input.peerPubKey, input.peerSalt]);

  return fullProve({
    sessionRoot,
    peerCommitment,
    maxNotional: input.maxNotional,
    epoch: input.registryEpoch,
    agentSk: input.agentSk,
    agentSalt: input.agentSalt,
    peerPubKey: input.peerPubKey,
    peerSalt: input.peerSalt,
    sessionId: input.sessionId,
    registryEpoch: input.registryEpoch,
  } as unknown as Record<string, unknown>, "auth", overrides);
}

export async function generateCompletionProof(
  input: CompletionProofInput,
  overrides?: ArtifactOverrides,
): Promise<ProofBundle> {
  const p = await getPoseidon();
  const nullifierHash = p([input.sessionId, input.agentSk]);
  const netCommit = p([input.netAmount, input.netSalt]);

  return fullProve({
    sessionRoot: input.sessionRoot,
    nullifierHash,
    netCommit,
    maxNotional: input.maxNotional,
    agentSk: input.agentSk,
    agentSalt: input.agentSalt,
    registryEpoch: input.registryEpoch,
    sessionId: input.sessionId,
    transfers: input.transfers,
    transferSalts: input.transferSalts,
    netAmount: input.netAmount,
    netSalt: input.netSalt,
  } as unknown as Record<string, unknown>, "completion", overrides);
}

export async function generatePoolNoteProof(
  input: PoolNoteProofInput,
  overrides?: ArtifactOverrides,
): Promise<ProofBundle> {
  const p = await getPoseidon();
  const noteCommitment = p([input.amount, input.ownerPk, input.salt, input.noteSecret]);
  const nullifier = p([input.noteSecret, BigInt(input.leafIndex)]);
  const newCommitment = p([input.newAmount, input.newOwnerPk, input.newSalt, input.noteSecret]);
  const feeCommit = p([input.fee, input.feeSalt]);
  void noteCommitment; // included in witness via path; consumer can re-derive if needed

  return fullProve({
    merkleRoot: input.merkleRoot,
    nullifier,
    newCommitment,
    feeCommit,
    amount: input.amount,
    noteSecret: input.noteSecret,
    ownerPk: input.ownerPk,
    salt: input.salt,
    leafIndex: input.leafIndex,
    pathElements: input.pathElements,
    pathIndices: input.pathIndices,
    newAmount: input.newAmount,
    newOwnerPk: input.newOwnerPk,
    newSalt: input.newSalt,
    fee: input.fee,
    feeSalt: input.feeSalt,
  } as unknown as Record<string, unknown>, "poolNote", overrides);
}
