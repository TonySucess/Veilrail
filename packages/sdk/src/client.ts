import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import type { VeilRailConfig, Session, SessionOptions, TransferOptions, ProofBundle } from "./types";
import { generateAuthProof, generateCompletionProof } from "./proof";
import { commit, deriveSessionRoot, nullifierFor } from "./hash";
import { PROGRAM_IDS } from "./constants";
import { submitProof } from "./submit";

/**
 * High-level client. Wraps proof generation, account derivation, and
 * transaction submission. The client is stateless across sessions —
 * session state lives entirely in the returned Session objects, so apps
 * can persist and resume them however they like.
 */
export class VeilRail {
  readonly connection: Connection;
  private cfg: VeilRailConfig;

  constructor(cfg: VeilRailConfig) {
    this.cfg = cfg;
    this.connection = cfg.connection ?? new Connection(
      cfg.cluster === "localnet"
        ? "http://127.0.0.1:8899"
        : clusterApiUrl(cfg.cluster as "devnet" | "mainnet-beta")
    );
  }

  /** Derive the on-chain Registry PDA. */
  registryPda(): PublicKey {
    return PublicKey.findProgramAddressSync([utf8("registry")], PROGRAM_IDS.registry)[0];
  }

  sessionPda(sessionRoot: Uint8Array): PublicKey {
    return PublicKey.findProgramAddressSync(
      [utf8("session"), sessionRoot],
      PROGRAM_IDS.session,
    )[0];
  }

  poolPda(): PublicKey {
    return PublicKey.findProgramAddressSync([utf8("pool")], PROGRAM_IDS.pool)[0];
  }

  /** Open a private payment session with `peer`. Returns a Session handle. */
  async openSession(opts: SessionOptions): Promise<{ session: Session; proof: ProofBundle }> {
    if (!this.cfg.wallet.publicKey) throw new Error("wallet not connected");
    const epoch = await this.fetchEpoch();
    const agentSk = randomFieldElement();
    const agentSalt = randomFieldElement();
    const peerPubKey = bigintFromBase58(opts.peer);
    const peerSalt = randomFieldElement();
    const sessionId = randomFieldElement();
    const agentCommitment = BigInt(await commit([agentSk, agentSalt]));
    const sessionRoot = await deriveSessionRoot(sessionId, BigInt(epoch), agentCommitment);

    const proof = await generateAuthProof({
      agentSk,
      agentSalt,
      peerPubKey,
      peerSalt,
      sessionId,
      registryEpoch: BigInt(epoch),
      maxNotional: BigInt(opts.maxNotional),
    }, this.cfg.circuitArtifacts);

    return {
      session: {
        sessionRoot,
        peerCommitment: await commit([peerPubKey, peerSalt]),
        maxNotional: opts.maxNotional,
        epoch,
        openSignature: "pending",
        sessionId,
        agentSk,
        agentSalt,
      },
      proof,
    };
  }

  /** Generate a single in-session transfer proof. */
  async proveTransfer(opts: TransferOptions): Promise<ProofBundle> {
    // For brevity in the client API we model a single transfer as a
    // completion proof with a 16-slot transfer vector containing one entry.
    const transfers = Array.from({ length: 16 }, (_, i) => i === 0 ? BigInt(opts.amount) : 0n);
    const salts = Array.from({ length: 16 }, () => randomFieldElement());
    return generateCompletionProof({
      agentSk: opts.session.agentSk,
      agentSalt: opts.session.agentSalt,
      registryEpoch: BigInt(opts.session.epoch),
      sessionId: opts.session.sessionId,
      transfers,
      transferSalts: salts,
      netAmount: BigInt(opts.amount),
      netSalt: opts.salt ?? randomFieldElement(),
      maxNotional: BigInt(opts.session.maxNotional),
      sessionRoot: BigInt(opts.session.sessionRoot),
    }, this.cfg.circuitArtifacts);
  }

  /** Submit a previously generated proof bundle. Returns the tx signature.
   *
   *  Builds the verifier instruction directly (no anchor dependency) and
   *  has the connected wallet sign + broadcast it. The proof's `circuit`
   *  field — set by `generateAuthProof`/`generateCompletionProof`/
   *  `generatePoolNoteProof` — selects the right `verify_*` entry point
   *  and the matching VK PDA. */
  async submit(proof: ProofBundle): Promise<string> {
    return submitProof(this.connection, this.cfg.wallet, proof);
  }

  /** Read the current registry epoch on-chain. */
  async fetchEpoch(): Promise<number> {
    const info = await this.connection.getAccountInfo(this.registryPda());
    if (!info) return 1;
    // First field after the 8-byte discriminator is the authority pubkey (32),
    // then epoch as u64 little-endian.
    const view = new DataView(info.data.buffer, info.data.byteOffset + 8 + 32, 8);
    return Number(view.getBigUint64(0, true));
  }

  async getNullifier(sessionId: bigint, agentSk: bigint): Promise<string> {
    return nullifierFor(sessionId, agentSk);
  }
}

function utf8(s: string): Uint8Array { return new TextEncoder().encode(s); }

const FIELD_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function randomFieldElement(): bigint {
  // Browser + node both expose crypto.getRandomValues.
  const bytes = new Uint8Array(32);
  (globalThis as unknown as { crypto: Crypto }).crypto.getRandomValues(bytes);
  let v = 0n;
  for (const b of bytes) v = (v << 8n) | BigInt(b);
  return v % FIELD_ORDER;
}

function bigintFromBase58(s: string): bigint {
  // Light helper — a real impl would decode base58 properly; we treat
  // the peer string as opaque and hash it into a field element.
  let h = 0n;
  for (const ch of s) h = (h * 257n + BigInt(ch.charCodeAt(0))) % FIELD_ORDER;
  return h;
}
