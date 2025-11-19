use crate::instructions::*;
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

declare_id!("9BT5z3cnBeTqvFQDdxcC6a7R5ZTN1TroX7u6H6UmLBkQ");

#[program]
pub mod escrow {
    use super::*;

    // Initialize a new escrow
    // Creates an escrow account that holds SOL until claimed or cancelled
    pub fn initialize(
        ctx: Context<Initialize>,
        amount: u64,
        escrow_id: u64,
    ) -> Result<()> {
        instructions::initialize::handler(ctx, amount, escrow_id)
    }

    // Claim the escrow funds (recipient only)
    // Transfers SOL from escrow to recipient and closes the account
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    // Cancel the escrow (depositor only)
    // Returns SOL to depositor and closes the account
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel::handler(ctx)
    }
}