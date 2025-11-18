use anchor_lang::prelude::*;

declare_id!("F1szfQ7EL2AZFiuoPB3TF81vdsbJyZoBLE6zaCuWMwL4");

#[program]
pub mod escrow {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
