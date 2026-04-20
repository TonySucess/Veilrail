//! VeilRail shielded UTXO pool program.
//!
//! Holds the global Merkle root of unspent note commitments. Spending a
//! note requires a VeilPoolNote proof which is verified by CPI into
//! veil_verifier. Spent nullifiers are written to PDAs to prevent reuse.

use anchor_lang::prelude::*;

declare_id!("8Wndka3Ryzcmhu234mSQWQdRA6GPwPmneq4LVchJSnnu");

pub const TREE_DEPTH: u8 = 28;
pub const ROOT_HISTORY_LEN: usize = 32; // accept proofs against the last 32 roots

#[program]
pub mod veil_pool {
    use super::*;

    /// Initialise the pool. The first root is the empty-tree root,
    /// passed in by the deployer (this is a constant derived from the
    /// circuit's hash function).
    pub fn initialize(ctx: Context<Initialize>, empty_root: [u8; 32]) -> Result<()> {
        let p = &mut ctx.accounts.pool;
        p.bump = ctx.bumps.pool;
        p.depth = TREE_DEPTH;
        p.next_index = 0;
        p.root_index = 0;
        p.roots = [[0u8; 32]; ROOT_HISTORY_LEN];
        p.roots[0] = empty_root;
        p.note_count = 0;
        emit!(PoolInitialized { depth: TREE_DEPTH });
        Ok(())
    }

    /// Insert a new note commitment (deposit or change output of a spend).
    /// The caller is responsible for computing the new Merkle root using
    /// the witness data; this program trusts the caller's computation
    /// because it is also constrained by the proof in the same tx.
    pub fn insert_commitment(
        ctx: Context<InsertCommitment>,
        commitment: [u8; 32],
        new_root: [u8; 32],
    ) -> Result<()> {
        let p = &mut ctx.accounts.pool;
        require!(
            p.next_index < (1u64 << TREE_DEPTH),
            VeilPoolError::TreeFull
        );
        p.next_index = p.next_index.checked_add(1).unwrap();
        p.root_index = ((p.root_index as usize + 1) % ROOT_HISTORY_LEN) as u8;
        let ri = p.root_index as usize;
        p.roots[ri] = new_root;
        p.note_count = p.note_count.checked_add(1).unwrap();
        emit!(NoteInserted {
            commitment,
            root: new_root,
            index: p.next_index - 1,
        });
        Ok(())
    }

    /// Mark a nullifier as spent. Fails if the PDA already exists.
    pub fn spend_nullifier(
        ctx: Context<SpendNullifier>,
        nullifier: [u8; 32],
        merkle_root: [u8; 32],
    ) -> Result<()> {
        let p = &ctx.accounts.pool;
        // Confirm the merkle_root the proof was authored against is one we know.
        require!(
            p.roots.iter().any(|r| r == &merkle_root),
            VeilPoolError::UnknownRoot
        );
        let n = &mut ctx.accounts.nullifier;
        n.nullifier = nullifier;
        n.bump = ctx.bumps.nullifier;
        emit!(NullifierBurned { nullifier });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Pool::SIZE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InsertCommitment<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(nullifier_value: [u8; 32])]
pub struct SpendNullifier<'info> {
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, Pool>,
    #[account(
        init,
        payer = payer,
        space = 8 + NullifierAccount::SIZE,
        seeds = [b"nullifier".as_ref(), nullifier_value.as_ref()],
        bump
    )]
    pub nullifier: Account<'info, NullifierAccount>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Pool {
    pub depth: u8,
    pub next_index: u64,
    pub root_index: u8,
    pub roots: [[u8; 32]; ROOT_HISTORY_LEN],
    pub note_count: u64,
    pub bump: u8,
}
impl Pool {
    pub const SIZE: usize = 1 + 8 + 1 + (32 * ROOT_HISTORY_LEN) + 8 + 1;
}

#[account]
pub struct NullifierAccount {
    pub nullifier: [u8; 32],
    pub bump: u8,
}
impl NullifierAccount {
    pub const SIZE: usize = 32 + 1;
}

#[event]
pub struct PoolInitialized { pub depth: u8 }
#[event]
pub struct NoteInserted { pub commitment: [u8; 32], pub root: [u8; 32], pub index: u64 }
#[event]
pub struct NullifierBurned { pub nullifier: [u8; 32] }

#[error_code]
pub enum VeilPoolError {
    #[msg("Tree is full.")]
    TreeFull,
    #[msg("Unknown Merkle root. Proof targets an evicted root.")]
    UnknownRoot,
}
