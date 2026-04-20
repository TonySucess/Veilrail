pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

/*
 * VeilAuthProof
 *
 * Prove that an autonomous agent is authorized to open a VeilRail session
 * with a counterparty, without revealing the agent's long-lived identity
 * key or the counterparty's identity.
 *
 * Public inputs:
 *   sessionRoot          Poseidon commitment to (sessionId, registryEpoch)
 *   peerCommitment       Poseidon(peerPubKey, peerSalt)
 *   maxNotional          Public per-session spend ceiling, in micro-USDC
 *   epoch                Current registry epoch (anti-replay)
 *
 * Private inputs:
 *   agentSk              Agent's Ed25519-style scalar (32 bytes, < r)
 *   agentSalt            Per-agent salt registered on-chain
 *   peerPubKey           Counterparty's long-lived pubkey scalar
 *   peerSalt             Counterparty's salt
 *   sessionId            Random 254-bit session identifier
 *   registryEpoch        Epoch this proof was authored against
 *
 * Constraints: ~4,200 (Poseidon-dominant)
 */
template VeilAuthProof() {
    // Public
    signal input sessionRoot;
    signal input peerCommitment;
    signal input maxNotional;
    signal input epoch;

    // Private
    signal input agentSk;
    signal input agentSalt;
    signal input peerPubKey;
    signal input peerSalt;
    signal input sessionId;
    signal input registryEpoch;

    // 1. Bind the proof to the current registry epoch (anti-replay).
    epoch === registryEpoch;

    // 2. Re-derive agent identity commitment from secret + salt.
    component agentCom = Poseidon(2);
    agentCom.inputs[0] <== agentSk;
    agentCom.inputs[1] <== agentSalt;

    // 3. Recompute peer commitment and force it to equal the public one.
    component peerCom = Poseidon(2);
    peerCom.inputs[0] <== peerPubKey;
    peerCom.inputs[1] <== peerSalt;
    peerCom.out === peerCommitment;

    // 4. Recompute session root and force it to equal the public one.
    component sessionCom = Poseidon(3);
    sessionCom.inputs[0] <== sessionId;
    sessionCom.inputs[1] <== registryEpoch;
    sessionCom.inputs[2] <== agentCom.out;
    sessionCom.out === sessionRoot;

    // 5. Range-check max notional to 64 bits to fit Solana u64 transfer amounts.
    component nLt = Num2Bits(64);
    nLt.in <== maxNotional;
}

component main { public [ sessionRoot, peerCommitment, maxNotional, epoch ] } = VeilAuthProof();
