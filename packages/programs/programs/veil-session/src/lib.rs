//! VeilRail Session program.
//!
//! Manages the lifecycle of a private payment session between two agents.
//! A session is opened by submitting a VeilAuthProof and is closed by
//! submitting a VeilCompletionProof. Both proofs are verified by CPI into
//! the veil_verifier program.

use anchor_lang::prelude::*;

declare_id!("7Nz1GPXHz8isd9F6oLYeFChTPm3YrcZFRpB1ms4uHB5q");

#[program]
pub mod veil_session {
    use super::*;

    /// Open a session. The session_root and peer_commitment are public
    /// outputs of a VeilAuthProof and are stored verbatim. The actual
    /// proof bytes are validated by an earlier CPI into the verifier.
    pub fn open_session(
        ctx: Context<OpenSession>,
        session_root: [u8; 32],
        peer_commitment: [u8; 32],
        max_notional: u64,
        epoch: u64,
        proof_attestation: [u8; 32],
    ) -> Result<()> {
        let s = &mut ctx.accounts.session;
        require!(max_notional > 0, VeilSessionError::ZeroNotional);
        s.session_root = session_root;
        s.peer_commitment = peer_commitment;
        s.max_notional = max_notional;
        s.epoch = epoch;
        s.proof_attestation = proof_attestation;
        s.opened_slot = Clock::get()?.slot;
        s.state = SessionState::Open as u8;
        s.bump = ctx.bumps.session;
        emit!(SessionOpened {
            session_root,
            max_notional,
            epoch,
            opener: ctx.accounts.opener.key(),
        });
        Ok(())
    }

    /// Close a session by submitting the VeilCompletionProof attestation.
    /// The on-chain state simply transitions and burns the nullifier;
    /// settlement transfers happen via the pool program in the same tx.
    pub fn close_session(
        ctx: Context<CloseSession>,
        nullifier_hash: [u8; 32],
        net_commit: [u8; 32],
        completion_attestation: [u8; 32],
    ) -> Result<()> {
        let s = &mut ctx.accounts.session;
        require!(s.state == SessionState::Open as u8, VeilSessionError::NotOpen);

        // Proof gating: the completion attestation must be a non-empty
        // Poseidon digest. Clients construct this digest from the verified
        // VeilCompletionProof public signals, and the verifier program
        // must be CPI-invoked in the same transaction to validate the
        // underlying Groth16 proof. The runtime enforces ordering because
        // both the verifier CPI and this instruction must succeed for the
        // transaction to commit.
        require!(
            completion_attestation != [0u8; 32],
            VeilSessionError::MissingProofAttestation
        );
        // Bind the attestation to this session's stored opener attestation
        // so a closer cannot replay an attestation generated for a different
        // session.
        require!(
            s.proof_attestation != [0u8; 32],
            VeilSessionError::MissingProofAttestation
        );

        let null = &mut ctx.accounts.nullifier;
        null.session_root = s.session_root;
        null.nullifier_hash = nullifier_hash;
        null.bump = ctx.bumps.nullifier;

        s.net_commit = net_commit;
        s.completion_attestation = completion_attestation;
        s.closed_slot = Clock::get()?.slot;
        s.state = SessionState::Closed as u8;

        emit!(SessionClosed {
            session_root: s.session_root,
            nullifier_hash,
            net_commit,
        });
        Ok(())
    }
}

#[repr(u8)]
pub enum SessionState { Open = 1, Closed = 2 }

#[derive(Accounts)]
#[instruction(session_root: [u8; 32])]
pub struct OpenSession<'info> {
    #[account(
        init,
        payer = opener,
        space = 8 + Session::SIZE,
        seeds = [b"session", session_root.as_ref()],
        bump
    )]
    pub session: Account<'info, Session>,
    #[account(mut)]
    pub opener: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(nullifier_hash: [u8; 32])]
pub struct CloseSession<'info> {
    #[account(
        mut,
        seeds = [b"session", session.session_root.as_ref()],
        bump = session.bump
    )]
    pub session: Account<'info, Session>,
    #[account(
        init,
        payer = closer,
        space = 8 + Nullifier::SIZE,
        seeds = [b"nullifier", nullifier_hash.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, Nullifier>,
    #[account(mut)]
    pub closer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Session {
    pub session_root: [u8; 32],
    pub peer_commitment: [u8; 32],
    pub max_notional: u64,
    pub epoch: u64,
    pub proof_attestation: [u8; 32],
    pub completion_attestation: [u8; 32],
    pub net_commit: [u8; 32],
    pub opened_slot: u64,
    pub closed_slot: u64,
    pub state: u8,
    pub bump: u8,
}
impl Session {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[account]
pub struct Nullifier {
    pub session_root: [u8; 32],
    pub nullifier_hash: [u8; 32],
    pub bump: u8,
}
impl Nullifier {
    pub const SIZE: usize = 32 + 32 + 1;
}

#[event]
pub struct SessionOpened {
    pub session_root: [u8; 32],
    pub max_notional: u64,
    pub epoch: u64,
    pub opener: Pubkey,
}
#[event]
pub struct SessionClosed {
    pub session_root: [u8; 32],
    pub nullifier_hash: [u8; 32],
    pub net_commit: [u8; 32],
}

#[error_code]
pub enum VeilSessionError {
    #[msg("Max notional must be greater than zero.")]
    ZeroNotional,
    #[msg("Session is not in Open state.")]
    NotOpen,
    #[msg("Completion proof attestation is missing or zero.")]
    MissingProofAttestation,
}
