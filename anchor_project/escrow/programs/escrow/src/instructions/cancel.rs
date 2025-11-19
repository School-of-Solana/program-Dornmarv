use anchor_lang::prelude::*;
use crate::state::Escrow;
use crate::errors::EscrowError;

#[derive(Accounts)]
pub struct Cancel<'info> {
    /// The depositor who created the escrow (only they can cancel)
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    /// The escrow PDA account
    #[account(
        mut,
        seeds = [
            Escrow::SEED_PREFIX,
            depositor.key().as_ref(),
            &escrow.escrow_id.to_le_bytes()
        ],
        bump = escrow.bump,
        has_one = depositor @ EscrowError::UnauthorizedCancel,
        close = depositor
    )]
    pub escrow: Account<'info, Escrow>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Cancel>) -> Result<()> {
    let escrow = &ctx.accounts.escrow;
    let amount = escrow.amount;
    
    msg!("Cancelling escrow!");
    msg!("Depositor: {}", ctx.accounts.depositor.key());
    msg!("Amount to refund: {} lamports", amount);
    msg!("Escrow ID: {}", escrow.escrow_id);
    
    // Transfer SOL from escrow PDA back to depositor
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
    
    // Transfer lamports from escrow back to depositor
    **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.depositor.to_account_info().try_borrow_mut_lamports()? += amount;
    
    msg!("Escrow cancelled successfully!");
    
    Ok(())
}