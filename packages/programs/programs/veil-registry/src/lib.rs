//! VeilRail Registry program.
//!
//! Holds the canonical list of agent identity commitments and the rolling
//! registry epoch that VeilAuthProof binds to. Identities are stored as
//! Poseidon commitments, never as raw pubkeys, so an observer cannot link
//! agents across deployments by reading the registry.

use anchor_lang::prelude::*;

declare_id!("A8n9yg7fd2AX3sS3qT5PuV4d4FtVcZxkgWQbozpyXRBM");

#[program]
pub mod veil_registry {
    use super::*;

    /// Initialise the registry singleton. Pays for the rent of the global
    /// state account. The deploying authority becomes the initial epoch
    /// rotator; this can be transferred to a multisig in a later upgrade.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let r = &mut ctx.accounts.registry;
        r.bump = ctx.bumps.registry;
        r.authority = ctx.accounts.authority.key();
        r.epoch = 1;
        r.agent_count = 0;
        r.last_rotated_slot = Clock::get()?.slot;
        emit!(RegistryInitialized { authority: r.authority });
        Ok(())
    }

    /// Register a new agent by writing its Poseidon identity commitment.
    /// The commitment is `Poseidon(agentSk, agentSalt)` computed off-chain
    /// inside VeilAuthProof. The on-chain account stores only the commitment
    /// so the agent's secret never touches the chain.
    pub fn register_agent(ctx: Context<RegisterAgent>, commitment: [u8; 32]) -> Result<()> {
        require!(commitment != [0u8; 32], VeilRegistryError::ZeroCommitment);
        let agent = &mut ctx.accounts.agent;
        let registry = &mut ctx.accounts.registry;
        agent.commitment = commitment;
        agent.epoch_registered = registry.epoch;
        agent.bump = ctx.bumps.agent;
        registry.agent_count = registry.agent_count.checked_add(1).unwrap();
        emit!(AgentRegistered { commitment, epoch: registry.epoch });
        Ok(())
    }

    /// Bump the registry epoch. Forces every outstanding session proof to
    /// be regenerated against the new epoch. Used as a circuit-level
    /// kill switch in case a contributor is compromised.
    pub fn rotate_epoch(ctx: Context<RotateEpoch>) -> Result<()> {
        let r = &mut ctx.accounts.registry;
        require_keys_eq!(r.authority, ctx.accounts.authority.key(), VeilRegistryError::Unauthorized);
        let now = Clock::get()?.slot;
        require!(
            now.saturating_sub(r.last_rotated_slot) >= MIN_ROTATE_SLOTS,
            VeilRegistryError::RotateTooSoon
        );
        r.epoch = r.epoch.checked_add(1).unwrap();
        r.last_rotated_slot = now;
        emit!(EpochRotated { new_epoch: r.epoch });
        Ok(())
    }
}

const MIN_ROTATE_SLOTS: u64 = 432_000; // ~2 days at 400ms slots

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Registry::SIZE,
        seeds = [b"registry"],
        bump
    )]
    pub registry: Account<'info, Registry>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(commitment: [u8; 32])]
pub struct RegisterAgent<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    #[account(
        init,
        payer = payer,
        space = 8 + Agent::SIZE,
        seeds = [b"agent", commitment.as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RotateEpoch<'info> {
    #[account(mut, seeds = [b"registry"], bump = registry.bump)]
    pub registry: Account<'info, Registry>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Registry {
    pub authority: Pubkey,
    pub epoch: u64,
    pub agent_count: u64,
    pub last_rotated_slot: u64,
    pub bump: u8,
}
impl Registry {
    pub const SIZE: usize = 32 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Agent {
    pub commitment: [u8; 32],
    pub epoch_registered: u64,
    pub bump: u8,
}
impl Agent {
    pub const SIZE: usize = 32 + 8 + 1;
}

#[event]
pub struct RegistryInitialized { pub authority: Pubkey }
#[event]
pub struct AgentRegistered { pub commitment: [u8; 32], pub epoch: u64 }
#[event]
pub struct EpochRotated { pub new_epoch: u64 }

#[error_code]
pub enum VeilRegistryError {
    #[msg("Commitment cannot be zero.")]
    ZeroCommitment,
    #[msg("Authority mismatch.")]
    Unauthorized,
    #[msg("Epoch rotated too recently. Wait at least 432,000 slots.")]
    RotateTooSoon,
}
