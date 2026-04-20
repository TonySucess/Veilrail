/**
 * @veilrail/sdk
 *
 * Client SDK for VeilRail. Generates Groth16 proofs against the three
 * VeilRail circuits in the browser or in node, and submits them to the
 * VeilRail Anchor programs on Solana.
 */

export { VeilRail, VeilRail as VeilRailSDK } from "./client";
export { generateAuthProof, generateCompletionProof, generatePoolNoteProof } from "./proof";
export { commit, nullifierFor, deriveSessionRoot } from "./hash";
export type {
  VeilRailConfig,
  Cluster,
  WalletLike,
  AuthProofInput,
  CompletionProofInput,
  PoolNoteProofInput,
  Proof,
  ProofBundle,
  Session,
  SessionOptions,
  TransferOptions,
} from "./types";
export { CIRCUIT_IDS, PROGRAM_IDS, DEPLOYMENT_STATUS, VERIFIER_CIRCUIT_TAG } from "./constants";
export { submitProof, buildVerifyInstruction, vkPda } from "./submit";
