import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { useState, useCallback, useMemo } from "react";

// Replace with your deployed program ID
const PROGRAM_ID = new PublicKey(
  "9BT5z3cnBeTqvFQDdxcC6a7R5ZTN1TroX7u6H6UmLBkQ"
);

// Inline IDL - this ensures it's always defined
const IDL = {
  version: "0.1.0",
  name: "escrow",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "depositor", isMut: true, isSigner: true },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "recipient", isMut: false, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "amount", type: "u64" },
        { name: "escrowId", type: "u64" },
      ],
    },
    {
      name: "claim",
      accounts: [
        { name: "recipient", isMut: true, isSigner: true },
        { name: "depositor", isMut: false, isSigner: false },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "cancel",
      accounts: [
        { name: "depositor", isMut: true, isSigner: true },
        { name: "escrow", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "escrow",
      type: {
        kind: "struct",
        fields: [
          { name: "depositor", type: "publicKey" },
          { name: "recipient", type: "publicKey" },
          { name: "amount", type: "u64" },
          { name: "bump", type: "u8" },
          { name: "escrowId", type: "u64" },
          { name: "createdAt", type: "i64" },
        ],
      },
    },
  ],
};

export interface EscrowAccount {
  publicKey: PublicKey;
  depositor: PublicKey;
  recipient: PublicKey;
  amount: number;
  escrowId: number;
  createdAt: number;
  bump: number;
}

export const useEscrow = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);

  // Create provider with useMemo to avoid recreation
  const provider = useMemo(() => {
    if (
      !wallet?.publicKey ||
      !wallet?.signTransaction ||
      !wallet?.signAllTransactions
    ) {
      return null;
    }

    const anchorWallet = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    };

    return new AnchorProvider(connection, anchorWallet, {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);

  // Create program with useMemo
  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(IDL, PROGRAM_ID, provider);
  }, [provider]);

  // Derive escrow PDA
  const getEscrowPda = useCallback(
    (depositor: PublicKey, escrowId: BN): [PublicKey, number] => {
      return PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.toBuffer(),
          escrowId.toArrayLike(Buffer, "le", 8),
        ],
        PROGRAM_ID
      );
    },
    []
  );

  // Initialize a new escrow
  const createEscrow = useCallback(
    async (recipientAddress: string, amountSol: number) => {
      if (!wallet.publicKey || !program) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const recipient = new PublicKey(recipientAddress);
        const amount = new BN(amountSol * LAMPORTS_PER_SOL);
        const escrowId = new BN(Date.now());

        const [escrowPda] = getEscrowPda(wallet.publicKey, escrowId);

        const tx = await program.methods
          .initialize(amount, escrowId)
          .accounts({
            depositor: wallet.publicKey,
            escrow: escrowPda,
            recipient: recipient,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Escrow created:", tx);
        return { signature: tx, escrowPda };
      } catch (error) {
        console.error("Error creating escrow:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [wallet.publicKey, program, getEscrowPda]
  );

  // Claim an escrow
  const claimEscrow = useCallback(
    async (depositor: PublicKey, escrowPda: PublicKey) => {
      if (!wallet.publicKey || !program) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tx = await program.methods
          .claim()
          .accounts({
            recipient: wallet.publicKey,
            depositor: depositor,
            escrow: escrowPda,
            systemProgram: SystemProgram.programId,
          })
           .signers([])
          .rpc();

        console.log("Escrow claimed:", tx);
        return tx;
      } catch (error) {
        console.error("Error claiming escrow:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [wallet.publicKey, program]
  );

  // Cancel an escrow
  const cancelEscrow = useCallback(
    async (escrowPda: PublicKey) => {
      if (!wallet.publicKey || !program) {
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tx = await program.methods
          .cancel()
          .accounts({
            depositor: wallet.publicKey,
            escrow: escrowPda,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("Escrow cancelled:", tx);
        return tx;
      } catch (error) {
        console.error("Error cancelling escrow:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [wallet.publicKey, program]
  );

  // Fetch all escrows for current wallet
  const fetchEscrows = useCallback(async () => {
    if (!wallet.publicKey || !program) {
      return { asDepositor: [], asRecipient: [] };
    }

    try {
      const allEscrows = await program.account.escrow.all();

      const asDepositor = allEscrows
        .filter((escrow: any) =>
          escrow.account.depositor.equals(wallet.publicKey!)
        )
        .map((e: any) => ({
          publicKey: e.publicKey,
          depositor: e.account.depositor,
          recipient: e.account.recipient,
          amount: e.account.amount.toNumber(),
          escrowId: e.account.escrowId.toNumber(),
          createdAt: e.account.createdAt.toNumber(),
          bump: e.account.bump,
        }));

      const asRecipient = allEscrows
        .filter((escrow: any) =>
          escrow.account.recipient.equals(wallet.publicKey!)
        )
        .map((e: any) => ({
          publicKey: e.publicKey,
          depositor: e.account.depositor,
          recipient: e.account.recipient,
          amount: e.account.amount.toNumber(),
          escrowId: e.account.escrowId.toNumber(),
          createdAt: e.account.createdAt.toNumber(),
          bump: e.account.bump,
        }));

      return { asDepositor, asRecipient };
    } catch (error) {
      console.error("Error fetching escrows:", error);
      return { asDepositor: [], asRecipient: [] };
    }
  }, [wallet.publicKey, program]);

  return {
    createEscrow,
    claimEscrow,
    cancelEscrow,
    fetchEscrows,
    loading,
    connected: !!wallet.publicKey,
  };
};
