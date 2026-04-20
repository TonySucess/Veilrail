import type { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

export type Cluster = "devnet" | "mainnet-beta" | "localnet";

export interface WalletLike {
  publicKey: PublicKey | null;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export interface VeilRailConfig {
  cluster: Cluster;
  wallet: WalletLike;
  connection?: Connection;
  /** Override the default circuit artifact URLs (.wasm + .zkey). */
  circuitArtifacts?: Partial<Record<CircuitName, { wasm: string; zkey: string }>>;
}

export type CircuitName = "auth" | "completion" | "poolNote";

export interface AuthProofInput {
  agentSk: bigint;
  agentSalt: bigint;
  peerPubKey: bigint;
  peerSalt: bigint;
  sessionId: bigint;
  registryEpoch: bigint;
  maxNotional: bigint;
}

export interface CompletionProofInput {
  agentSk: bigint;
  agentSalt: bigint;
  registryEpoch: bigint;
  sessionId: bigint;
  transfers: bigint[]; // length 16, pad with zeros
  transferSalts: bigint[]; // length 16
  netAmount: bigint;
  netSalt: bigint;
  maxNotional: bigint;
  sessionRoot: bigint;
}

export interface PoolNoteProofInput {
  amount: bigint;
  noteSecret: bigint;
  ownerPk: bigint;
  salt: bigint;
  leafIndex: bigint;
  pathElements: bigint[]; // length 28
  pathIndices: number[]; // length 28, each 0 or 1
  newAmount: bigint;
  newOwnerPk: bigint;
  newSalt: bigint;
  fee: bigint;
  feeSalt: bigint;
  merkleRoot: bigint;
}

export interface Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: "groth16";
  curve: "bn128";
}

export interface ProofBundle {
  proof: Proof;
  publicSignals: string[];
  /** Which circuit this proof targets. Set automatically by the SDK proof
   *  helpers; required by `VeilRail.submit` so the right verifier
   *  instruction discriminator + VK PDA are selected. */
  circuit?: CircuitName;
  /** Stage timings in ms — useful for the docs Playground panel. */
  stages: { name: string; ms: number }[];
  totalMs: number;
}

export interface SessionOptions {
  peer: string;
  maxNotional: number; // micro-USDC
  ttlSlots?: number;
}

export interface Session {
  sessionRoot: string; // hex
  peerCommitment: string;
  maxNotional: number;
  epoch: number;
  openSignature: string;
  // Local-only secrets retained by the originating client so that subsequent
  // completion proofs can rebind to the registered sessionRoot. Never leaves
  // the browser.
  sessionId: bigint;
  agentSk: bigint;
  agentSalt: bigint;
}

export interface TransferOptions {
  session: Session;
  amount: number; // micro-USDC
  salt?: bigint;
}
