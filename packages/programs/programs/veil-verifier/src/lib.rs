//! VeilRail Groth16 BN254 proof verifier program.
//!
//! Uses Solana's `alt_bn128` syscalls to verify Groth16 proofs over BN254.
//! Each circuit (auth, completion, pool note) has a verification key
//! account stored on-chain. The session/pool programs CPI into this
//! program to validate proofs before mutating state.

use anchor_lang::prelude::*;
use solana_program::alt_bn128::prelude::*;

declare_id!("ACrnPGpU13DNrFKArnDB4KoxonNNBGE4NfrYHNwR3GbY");

#[program]
pub mod veil_verifier {
    use super::*;

    /// Store a verification key on-chain. The vk bytes are the
    /// concatenation of (alpha_g1, beta_g2, gamma_g2, delta_g2, ic[]) in
    /// big-endian field encoding, exactly as produced by snarkjs.
    pub fn upload_vk(
        ctx: Context<UploadVk>,
        circuit_id: u8,
        vk_bytes: Vec<u8>,
    ) -> Result<()> {
        let v = &mut ctx.accounts.vk;
        require!(vk_bytes.len() <= MAX_VK_BYTES, VeilVerifierError::VkTooLarge);
        v.circuit_id = circuit_id;
        v.bytes_len = vk_bytes.len() as u32;
        v.bytes[..vk_bytes.len()].copy_from_slice(&vk_bytes);
        v.bump = ctx.bumps.vk;
        Ok(())
    }

    /// Verify a Groth16 proof for the VeilAuthProof circuit. Thin wrapper
    /// around the generic verify path that requires the loaded VK to be
    /// tagged with `circuit_id == 0` (auth).
    pub fn verify_auth(ctx: Context<Verify>, proof: VerifyProofInput) -> Result<()> {
        require!(ctx.accounts.vk.circuit_id == 0, VeilVerifierError::WrongCircuit);
        verify_inner(&ctx.accounts.vk, &proof)
    }

    /// Verify a Groth16 proof for the VeilCompletionProof circuit
    /// (`circuit_id == 1`).
    pub fn verify_completion(ctx: Context<Verify>, proof: VerifyProofInput) -> Result<()> {
        require!(ctx.accounts.vk.circuit_id == 1, VeilVerifierError::WrongCircuit);
        verify_inner(&ctx.accounts.vk, &proof)
    }

    /// Verify a Groth16 proof for the VeilPoolNoteProof circuit
    /// (`circuit_id == 2`).
    pub fn verify_pool(ctx: Context<Verify>, proof: VerifyProofInput) -> Result<()> {
        require!(ctx.accounts.vk.circuit_id == 2, VeilVerifierError::WrongCircuit);
        verify_inner(&ctx.accounts.vk, &proof)
    }

    /// Generic Groth16 verify entry point. Prefer `verify_auth`,
    /// `verify_completion`, or `verify_pool` for circuit-tagged calls so
    /// CPI callers cannot accidentally feed the wrong VK.
    pub fn verify(
        ctx: Context<Verify>,
        proof: VerifyProofInput,
    ) -> Result<()> {
        verify_inner(&ctx.accounts.vk, &proof)
    }
}

fn verify_inner(vk_acc: &Account<Vk>, proof: &VerifyProofInput) -> Result<()> {
    {
        let v = vk_acc;
        let vk = &v.bytes[..v.bytes_len as usize];

        // Build the BN254 pairing input: prepare the four pairs:
        //   e(-A, B) * e(alpha, beta) * e(L, gamma) * e(C, delta) == 1
        // where L = vk.ic[0] + sum(public_inputs[i] * vk.ic[i+1]).
        let mut pairing_input = Vec::with_capacity(4 * 192);
        pairing_input.extend_from_slice(&proof.proof_a);
        pairing_input.extend_from_slice(&proof.proof_b);

        let alpha_g1 = &vk[..64];
        let beta_g2 = &vk[64..192];
        pairing_input.extend_from_slice(alpha_g1);
        pairing_input.extend_from_slice(beta_g2);

        let gamma_g2 = &vk[192..320];
        let delta_g2 = &vk[320..448];

        // Compute L = sum of public_input * ic.
        let mut l_acc = vk[448..512].to_vec(); // ic[0]
        for (i, p) in proof.public_inputs.iter().enumerate() {
            let off = 512 + i * 64;
            require!(off + 64 <= vk.len(), VeilVerifierError::IcOutOfRange);
            let ic_i = &vk[off..off + 64];
            let mut input = Vec::with_capacity(96);
            input.extend_from_slice(ic_i);
            input.extend_from_slice(p);
            let scaled = alt_bn128_multiplication(&input)
                .map_err(|_| VeilVerifierError::SyscallFailed)?;

            let mut add_in = Vec::with_capacity(128);
            add_in.extend_from_slice(&l_acc);
            add_in.extend_from_slice(&scaled);
            let sum = alt_bn128_addition(&add_in)
                .map_err(|_| VeilVerifierError::SyscallFailed)?;
            l_acc = sum;
        }

        pairing_input.extend_from_slice(&l_acc);
        pairing_input.extend_from_slice(gamma_g2);
        pairing_input.extend_from_slice(&proof.proof_c);
        pairing_input.extend_from_slice(delta_g2);

        let result = alt_bn128_pairing(&pairing_input)
            .map_err(|_| VeilVerifierError::SyscallFailed)?;

        // result == 1 in big-endian => last byte is 1, rest 0.
        let ok = result.len() == 32
            && result.iter().take(31).all(|b| *b == 0)
            && result[31] == 1;
        require!(ok, VeilVerifierError::ProofInvalid);
        emit!(ProofVerified { circuit_id: v.circuit_id });
        Ok(())
    }
}

const MAX_VK_BYTES: usize = 4096;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerifyProofInput {
    pub proof_a: [u8; 64],
    pub proof_b: [u8; 128],
    pub proof_c: [u8; 64],
    pub public_inputs: Vec<[u8; 32]>,
}

#[derive(Accounts)]
#[instruction(circuit_id: u8)]
pub struct UploadVk<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Vk::SIZE,
        seeds = [b"vk".as_ref(), &[circuit_id]],
        bump
    )]
    pub vk: Account<'info, Vk>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Verify<'info> {
    #[account(seeds = [b"vk".as_ref(), &[vk.circuit_id]], bump = vk.bump)]
    pub vk: Account<'info, Vk>,
}

#[account]
pub struct Vk {
    pub circuit_id: u8,
    pub bytes_len: u32,
    pub bytes: [u8; MAX_VK_BYTES],
    pub bump: u8,
}
impl Vk {
    pub const SIZE: usize = 1 + 4 + MAX_VK_BYTES + 1;
}

#[event]
pub struct ProofVerified { pub circuit_id: u8 }

#[error_code]
pub enum VeilVerifierError {
    #[msg("Verification key too large.")]
    VkTooLarge,
    #[msg("Public input index exceeds VK ic table.")]
    IcOutOfRange,
    #[msg("BN254 syscall failed.")]
    SyscallFailed,
    #[msg("Proof is invalid.")]
    ProofInvalid,
    #[msg("Verification key tag does not match the called circuit-specific entry point.")]
    WrongCircuit,
}
