use anchor_lang::prelude::*;
use crate::state::Escrow;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct Claim<'info> {
    /// The recipient claiming the funds (must match escrow.recipient)
    #[account(mut)]
    pub recipient: Signer<'info>,
    
    /// The depositor who created the escrow
    /// CHECK: Only used in seeds, safe
    pub depositor: UncheckedAccount<'info>,
    
    /// The escrow PDA account
    #[account(
        mut,
        seeds = [
            Escrow::SEED_PREFIX,
            depositor.key().as_ref(),
            &escrow.escrow_id.to_le_bytes()
        ],
        bump = escrow.bump,
        has_one = recipient @ EscrowError::UnauthorizedClaim,
        has_one = depositor,
        close = recipient
    )]
    pub escrow: Account<'info, Escrow>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Claim>) -> Result<()> {
    let escrow = &ctx.accounts.escrow;
    let amount = escrow.amount;
    
    msg!("Claiming escrow!");
    msg!("Recipient: {}", ctx.accounts.recipient.key());
    msg!("Amount: {} lamports", amount);
    msg!("Escrow ID: {}", escrow.escrow_id);
    
    // Transfer SOL from escrow PDA to recipient
    // We need to sign with PDA seeds
    let depositor_key = ctx.accounts.depositor.key();
    let escrow_id = escrow.escrow_id;
    let bump = escrow.bump;
    
    let signer_seeds: &[&[&[u8]]] = &[&[
        Escrow::SEED_PREFIX,
        depositor_key.as_ref(),
        &escrow_id.to_le_bytes(),
        &[bump],
    ]];
    
    // Transfer lamports from escrow to recipient
    **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += amount;
    
    msg!("Escrow claimed successfully!");
    
    Ok(())
}