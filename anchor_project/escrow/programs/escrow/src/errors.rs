use anchor_lang::prelude::*;

#[error_code]
pub enum EscrowError {
    #[msg("Insufficient balance to create escrow")]
    InsufficientBalance,
    
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Unauthorized: Only recipient can claim")]
    UnauthorizedClaim,
    
    #[msg("Unauthorized: Only depositor can cancel")]
    UnauthorizedCancel,
}