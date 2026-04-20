import { PublicKey } from "@solana/web3.js";

export const CIRCUIT_IDS = {
  auth: 1,
  completion: 2,
  poolNote: 3,
} as const;

/**
 * On-chain circuit tag bytes used in the verifier program. These index the
 * `vk` PDA seeds (`[b"vk", &[tag]]`) and gate the per-circuit `verify_*`
 * entry points (`verify_auth` requires tag 0, etc). They are intentionally
 * a separate enum from `CIRCUIT_IDS` because `CIRCUIT_IDS` is used in
 * client-facing logging while these bytes are wire-level identifiers.
 */
export const VERIFIER_CIRCUIT_TAG = {
  auth: 0,
  completion: 1,
  poolNote: 2,
} as const;

export const PROGRAM_IDS = {
  registry: new PublicKey("A8n9yg7fd2AX3sS3qT5PuV4d4FtVcZxkgWQbozpyXRBM"),
  session:  new PublicKey("7Nz1GPXHz8isd9F6oLYeFChTPm3YrcZFRpB1ms4uHB5q"),
  pool:     new PublicKey("8Wndka3Ryzcmhu234mSQWQdRA6GPwPmneq4LVchJSnnu"),
  verifier: new PublicKey("ACrnPGpU13DNrFKArnDB4KoxonNNBGE4NfrYHNwR3GbY"),
} as const;

/**
 * Deployment status of the four Anchor programs on Solana devnet.
 *
 * Flip this to "live" once `anchor deploy --provider.cluster devnet`
 * has succeeded for all four programs and the program IDs above have
 * been updated to the real deploy keys (see packages/programs/DEPLOY.md).
 *
 * The dashboard reads this flag to decide whether to fetch live on-chain
 * state or to render the "deployment pending" placeholder.
 */
export const DEPLOYMENT_STATUS: "pending" | "live" = "live";

export const DEFAULT_ARTIFACT_BASE = "/circuits";

export const DEFAULT_CIRCUIT_ARTIFACTS = {
  auth: {
    wasm: `${DEFAULT_ARTIFACT_BASE}/veil_auth.wasm`,
    zkey: `${DEFAULT_ARTIFACT_BASE}/veil_auth_final.zkey`,
  },
  completion: {
    wasm: `${DEFAULT_ARTIFACT_BASE}/veil_completion.wasm`,
    zkey: `${DEFAULT_ARTIFACT_BASE}/veil_completion_final.zkey`,
  },
  poolNote: {
    wasm: `${DEFAULT_ARTIFACT_BASE}/veil_pool_note.wasm`,
    zkey: `${DEFAULT_ARTIFACT_BASE}/veil_pool_note_final.zkey`,
  },
} as const;
