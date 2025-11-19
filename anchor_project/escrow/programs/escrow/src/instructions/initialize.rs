use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use crate::state::Escrow;
use crate::errors::EscrowError;

#[derive(Accounts)]
#[instruction(amount: u64, escrow_id: u64)]
pub struct Initialize<'info> {
    /// The user creating the escrow
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    /// The escrow PDA account to be created
    /// Seeds: ["escrow", depositor.key, escrow_id]
    #[account(
        init,
        payer = depositor,
        space = Escrow::LEN,
        seeds = [
            Escrow::SEED_PREFIX,
            depositor.key().as_ref(),
            &escrow_id.to_le_bytes()
        ],
        bump
    )]
    pub escrow: Account<'info, Escrow>,
    
    /// The user who will be able to claim the funds
    /// CHECK: This is just stored as recipient address
    pub recipient: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Initialize>,
    amount: u64,
    escrow_id: u64,
) -> Result<()> {
    // Validate amount
    require!(amount > 0, EscrowError::InvalidAmount);
    
    let escrow = &mut ctx.accounts.escrow;
    let depositor = &ctx.accounts.depositor;
    let clock = Clock::get()?;
    
    // Initialize escrow state
    escrow.depositor = depositor.key();
    escrow.recipient = ctx.accounts.recipient.key();
    escrow.amount = amount;
    escrow.bump = ctx.bumps.escrow;
    escrow.escrow_id = escrow_id;
    escrow.created_at = clock.unix_timestamp;
    
    // Transfer SOL from depositor to escrow PDA
    let transfer_accounts = Transfer {
        from: depositor.to_account_info(),
        to: escrow.to_account_info(),
    };
    
    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        transfer_accounts,
    );
    
    transfer(transfer_ctx, amount)?;
    
    msg!("Escrow initialized!");
    msg!("Depositor: {}", escrow.depositor);
    msg!("Recipient: {}", escrow.recipient);
    msg!("Amount: {} lamports", escrow.amount);
    msg!("Escrow ID: {}", escrow.escrow_id);
    
    Ok(())
}