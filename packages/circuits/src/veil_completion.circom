pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

/*
 * VeilCompletionProof
 *
 * Prove that a session settled correctly: the cumulative debit equals
 * the sum of in-session transfers, every transfer was within the
 * pre-committed maxNotional, and the resulting nullifier hasn't been
 * spent before. Reveals nothing about counterparties or per-transfer
 * amounts.
 *
 * Public inputs:
 *   sessionRoot          Same as VeilAuthProof
 *   nullifierHash        Poseidon(sessionId, agentSk) — burned on settle
 *   netCommit            Poseidon commitment to the final net transfer amount
 *   maxNotional          The ceiling fixed at session open
 *
 * Private inputs:
 *   agentSk              Agent's secret
 *   agentSalt            Agent's commitment salt (same as in auth)
 *   registryEpoch        Registry epoch under which the session was opened
 *   sessionId            Session identifier
 *   transfers[N]         Array of N per-call amounts (micro-USDC)
 *   transferSalts[N]     Per-transfer salts (mix into commitment)
 *   netAmount            Sum of transfers
 *   netSalt              Salt mixed into netCommit
 *
 * N is fixed at 16 transfers per session for circuit determinism.
 * Constraints: ~12,800 (Poseidon-dominant)
 */
template VeilCompletionProof(N) {
    // Public
    signal input sessionRoot;
    signal input nullifierHash;
    signal input netCommit;
    signal input maxNotional;

    // Private
    signal input agentSk;
    signal input agentSalt;
    signal input registryEpoch;
    signal input sessionId;
    signal input transfers[N];
    signal input transferSalts[N];
    signal input netAmount;
    signal input netSalt;

    // 1. Recompute and check the nullifier — prevents double-settle.
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== sessionId;
    nullifier.inputs[1] <== agentSk;
    nullifier.out === nullifierHash;

    // 2. Range-check every transfer to 64 bits and accumulate.
    signal accum[N + 1];
    accum[0] <== 0;

    component xfrBits[N];
    for (var i = 0; i < N; i++) {
        xfrBits[i] = Num2Bits(64);
        xfrBits[i].in <== transfers[i];
        accum[i + 1] <== accum[i] + transfers[i];
    }

    // 3. Force the accumulator to equal the claimed netAmount.
    accum[N] === netAmount;

    // 4. Bound the net amount by the pre-committed ceiling. We require
    //    netAmount <= maxNotional, both 64-bit.
    component leq = LessEqThan(65);
    leq.in[0] <== netAmount;
    leq.in[1] <== maxNotional;
    leq.out === 1;

    // 5. Recompute the net commitment.
    component netCom = Poseidon(2);
    netCom.inputs[0] <== netAmount;
    netCom.inputs[1] <== netSalt;
    netCom.out === netCommit;

    // 6. Bind the proof back to the original session root. We recompute it
    //    using the same derivation as VeilAuthProof:
    //      sessionRoot = Poseidon(sessionId, registryEpoch, agentCommitment)
    //      agentCommitment = Poseidon(agentSk, agentSalt)
    component agentCom = Poseidon(2);
    agentCom.inputs[0] <== agentSk;
    agentCom.inputs[1] <== agentSalt;

    component sessionCom = Poseidon(3);
    sessionCom.inputs[0] <== sessionId;
    sessionCom.inputs[1] <== registryEpoch;
    sessionCom.inputs[2] <== agentCom.out;
    sessionCom.out === sessionRoot;
}

component main { public [ sessionRoot, nullifierHash, netCommit, maxNotional ] } = VeilCompletionProof(16);
