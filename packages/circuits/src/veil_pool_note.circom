pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/mux1.circom";

/*
 * VeilPoolNote
 *
 * UTXO-style shielded note proof for the VeilRail pool. Demonstrates
 * spending one note and creating a new note of equal value, anchored
 * to a public Merkle root, without revealing which leaf was spent or
 * the recipient.
 *
 * Public inputs:
 *   merkleRoot           Current pool root (32-byte field element)
 *   nullifier            Poseidon(noteSecret, leafIndex) — burned on spend
 *   newCommitment        Poseidon(newAmount, newOwnerPk, newSalt)
 *   feeCommit            Poseidon(fee, feeSalt)
 *
 * Private inputs:
 *   amount               Note value (micro-USDC)
 *   noteSecret           Spender's note nullifier-deriving secret
 *   ownerPk              Spender's pubkey scalar
 *   salt                 Original note salt
 *   leafIndex            Position in the Merkle tree (0 .. 2^DEPTH - 1)
 *   pathElements[DEPTH]  Merkle siblings
 *   pathIndices[DEPTH]   Direction bits (0 = left, 1 = right)
 *   newAmount            Recipient's note amount
 *   newOwnerPk           Recipient's pubkey scalar
 *   newSalt              Recipient's note salt
 *   fee                  Protocol fee (micro-USDC)
 *   feeSalt              Salt for fee commitment
 *
 * Conservation: amount = newAmount + fee.
 *
 * DEPTH = 28 → 2^28 ≈ 268M notes.
 * Constraints: ~28,000 (Merkle path + Poseidon hashes)
 */
template VeilPoolNote(DEPTH) {
    // Public
    signal input merkleRoot;
    signal input nullifier;
    signal input newCommitment;
    signal input feeCommit;

    // Private
    signal input amount;
    signal input noteSecret;
    signal input ownerPk;
    signal input salt;
    signal input leafIndex;
    signal input pathElements[DEPTH];
    signal input pathIndices[DEPTH];
    signal input newAmount;
    signal input newOwnerPk;
    signal input newSalt;
    signal input fee;
    signal input feeSalt;

    // 1. Range checks (64-bit values, fee bounded by amount).
    component aBits = Num2Bits(64); aBits.in <== amount;
    component naBits = Num2Bits(64); naBits.in <== newAmount;
    component fBits = Num2Bits(64); fBits.in <== fee;

    // 2. Conservation of value.
    amount === newAmount + fee;

    // 3. Recompute the leaf commitment Poseidon(amount, ownerPk, salt).
    component leafCom = Poseidon(3);
    leafCom.inputs[0] <== amount;
    leafCom.inputs[1] <== ownerPk;
    leafCom.inputs[2] <== salt;

    // 4. Recompute nullifier Poseidon(noteSecret, leafIndex).
    component nullCom = Poseidon(2);
    nullCom.inputs[0] <== noteSecret;
    nullCom.inputs[1] <== leafIndex;
    nullCom.out === nullifier;

    // 5. Verify the Merkle path from the leaf up to the public root.
    signal levelHashes[DEPTH + 1];
    levelHashes[0] <== leafCom.out;

    component pathHash[DEPTH];
    component selectors[DEPTH];

    for (var i = 0; i < DEPTH; i++) {
        // pathIndices[i] must be a bit.
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        selectors[i] = MultiMux1(2);
        selectors[i].c[0][0] <== levelHashes[i];
        selectors[i].c[0][1] <== pathElements[i];
        selectors[i].c[1][0] <== pathElements[i];
        selectors[i].c[1][1] <== levelHashes[i];
        selectors[i].s <== pathIndices[i];

        pathHash[i] = Poseidon(2);
        pathHash[i].inputs[0] <== selectors[i].out[0];
        pathHash[i].inputs[1] <== selectors[i].out[1];

        levelHashes[i + 1] <== pathHash[i].out;
    }

    levelHashes[DEPTH] === merkleRoot;

    // 6. Recompute output commitment.
    component outCom = Poseidon(3);
    outCom.inputs[0] <== newAmount;
    outCom.inputs[1] <== newOwnerPk;
    outCom.inputs[2] <== newSalt;
    outCom.out === newCommitment;

    // 7. Recompute fee commitment.
    component feeCom = Poseidon(2);
    feeCom.inputs[0] <== fee;
    feeCom.inputs[1] <== feeSalt;
    feeCom.out === feeCommit;
}

component main { public [ merkleRoot, nullifier, newCommitment, feeCommit ] } = VeilPoolNote(28);
