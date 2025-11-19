# Project Description

**Deployed Frontend URL:** https://escrow-dapp-jade.vercel.app

**Solana Program ID:** 9BT5z3cnBeTqvFQDdxcC6a7R5ZTN1TroX7u6H6UmLBkQ

## Project Overview

### Description
EscrowDAPP is a secure peer-to-peer escrow service built on Solana that enables trustless SOL transfers between two parties. Users can create escrow accounts where funds are locked until the designated recipient claims them, or the depositor cancels the transaction. Each escrow is uniquely identified and secured using Program Derived Addresses (PDAs), ensuring that only authorized parties can interact with the funds

### Key Features
- **Create Escrow**: Lock SOL in an escrow account for a specific recipient
- **Claim Funds**: Recipients can claim locked funds from escrows sent to them
- **Cancel & Refund**: Depositors can cancel unclaimed escrows and receive full refunds
- **Dual View Dashboard**: Separate views for escrows you've created vs. escrows you can claim
- **Multiple Escrows**: Support for creating multiple simultaneous escrows with unique IDs
- **Real-time Updates**: Automatic refresh to display latest escrow states
  
### How to Use the dApp

1. **Connect Wallet** Click "Select Wallet" and connect your Phantom or Solflare wallet
2. **Create Escrow:** Enter the recipient's wallet address and amount in SOL, then click "Create Escrow" and sign the transaction on your wallet
3. **View Your Escrows:** See two panels:
"Created by You": Escrows you've deposited 
"Sent to You": Escrows where you're the recipient
4. **Claim as Recipient:** In the "Sent to You" panel, click "Claim Funds" to receive the SOL
5. **Cancel as Depositor:** In the "Created by You" panel, click "Cancel & Refund" to get your SOL back

## Program Architecture
The Escrow dApp implements a secure three-instruction architecture with PDA-based escrow accounts that hold funds until resolution. The program uses Solana's native account model to create isolated escrow storage, ensuring that funds can only be moved by authorized parties through validated instruction calls.

### PDA Usage
The program leverages Program Derived Addresses to create deterministic, secure escrow accounts that can hold SOL and verify authorization without requiring private keys.

**PDAs Used:**
- **Escrow PDA**: Derived from seeds ["escrow", depositor_pubkey, escrow_id_u64] which ensures each escrow has a unique, deterministic address that can only be controlled by program instructions with proper authorization checks

### Program Instructions

**Instructions Implemented:**
- **Initialize**: Creates a new escrow account, transfers SOL from depositor to the escrow PDA, and stores depositor/recipient information
- **Claim**: Allows only the designated recipient to claim the funds, transfers SOL from escrow to recipient, and closes the escrow account and rent returns to depositor
- **Cancel**: Allows only the original depositor to cancel the escrow, refunds SOL to depositor, and closes the escrow account

### Account Structure

```rust
#[account]
pub struct Escrow {
    pub depositor: Pubkey,    // The wallet that created and funded the escrow
    pub recipient: Pubkey,    // The wallet authorized to claim the funds
    pub amount: u64,          // Amount of lamports held in escrow
    pub bump: u8,             // PDA bump seed for signing
    pub escrow_id: u64,       // Unique identifier for this escrow
    pub created_at: i64,      // Unix timestamp when escrow was created
}
```

## Testing

### Test Coverage
Comprehensive test suite with 11 test cases covering all three instructions, successful operations, authorization checks, edge cases, and error conditions to ensure program security and fund safety.

**Happy Path Tests:**
- **Initialize Escrow**: Successfully creates escrow, transfers SOL, verifies account data and balance changes
- **Claim Escrow**: Recipient successfully claims funds, receives correct amount, escrow account closed
- **Cancel Escrow**: Depositor successfully cancels, receives refund, escrow account closed
- **Multiple Escrows**: Same user can create multiple escrows with different IDs and recipients

**Unhappy Path Tests:**
- **Zero Amount**: Fails when trying to create escrow with 0 SOL
- **Duplicate Escrow ID**: Fails when trying to create escrow with existing ID
- **Unauthorized Claim**: Fails when wrong person tries to claim
- **Double Claim**: Fails when trying to claim already-claimed escrow
- **Unauthorized Cancel**: Fails when wrong person tries to cancel
- **Double Cancel**: Fails when trying to cancel already-cancelled escrow
- **Claim after Cancel**: Recipient cannot claim after depositor cancels

### Running Tests
```bash
cd anchor_project/escrow
yarn install              # install dependencies
anchor test               # run all tests 
```

### Additional Notes for Evaluators

This project was an incredible learning experience in building contracts on Solana, I have always wanted to build an escrow contract and i am so glad i finally did, i have a few ideas around escrow platforms and i plan to build on this in the future