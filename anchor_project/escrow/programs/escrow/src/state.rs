use anchor_lang::prelude::*;

#[account]
pub struct Escrow {
    // The user who created and funded the escrow
    pub depositor: Pubkey, // 32 bytes

    // The user who can claim the escrow funds
    pub recipient: Pubkey, // 32 bytes

    // Amount of lamports held in escrow
    pub amount: u64, // 8 bytes

    // PDA bump seed for signing
    pub bump: u8, // 1 byte

    // Unique identifier for this escrow
    pub escrow_id: u64, // 8 bytes

    // Unix timestamp when escrow was created
    pub created_at: i64, // 8 bytes
}

impl Escrow {
    // Calculate space needed for the account
    // 8 (discriminator) + 32 + 32 + 8 + 1 + 8 + 8 = 97 bytes
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1 + 8 + 8;

    // Seed prefix for PDA derivation
    pub const SEED_PREFIX: &'static [u8] = b"escrow";
}
