import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  // Test accounts
  let depositor: anchor.web3.Keypair;
  let recipient: anchor.web3.Keypair;
  let wrongPerson: anchor.web3.Keypair;

  // Escrow details
  const escrowAmount = 1 * LAMPORTS_PER_SOL; // 1 SOL
  let escrowId: anchor.BN;
  let escrowPda: PublicKey;

  before(async () => {
    // Create test keypairs
    depositor = anchor.web3.Keypair.generate();
    recipient = anchor.web3.Keypair.generate();
    wrongPerson = anchor.web3.Keypair.generate();

    // Airdrop SOL to depositor for testing
    const airdropSignature = await provider.connection.requestAirdrop(
      depositor.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature);

    // Airdrop SOL to wrong person for testing unauthorized actions
    const airdropSignature2 = await provider.connection.requestAirdrop(
      wrongPerson.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSignature2);

    console.log("Test accounts funded");
  });

  describe("Initialize Escrow", () => {
    it("Successfully initializes an escrow", async () => {
      // Generate unique escrow ID
      escrowId = new anchor.BN(Date.now());

      // Derive PDA
      [escrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          escrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      // Get balances before
      const depositorBalanceBefore = await provider.connection.getBalance(
        depositor.publicKey
      );

      // Initialize escrow
      const tx = await program.methods
        .initialize(new anchor.BN(escrowAmount), escrowId)
        .accounts({
          depositor: depositor.publicKey,
          escrow: escrowPda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      console.log("Transaction signature:", tx);

      // Fetch the escrow account
      const escrowAccount = await program.account.escrow.fetch(escrowPda);

      // Verify escrow data
      assert.equal(
        escrowAccount.depositor.toString(),
        depositor.publicKey.toString(),
        "Depositor mismatch"
      );
      assert.equal(
        escrowAccount.recipient.toString(),
        recipient.publicKey.toString(),
        "Recipient mismatch"
      );
      assert.equal(
        escrowAccount.amount.toNumber(),
        escrowAmount,
        "Amount mismatch"
      );
      assert.equal(
        escrowAccount.escrowId.toNumber(),
        escrowId.toNumber(),
        "Escrow ID mismatch"
      );

      // Verify depositor's balance decreased
      const depositorBalanceAfter = await provider.connection.getBalance(
        depositor.publicKey
      );
      assert.isBelow(
        depositorBalanceAfter,
        depositorBalanceBefore - escrowAmount,
        "Depositor balance should decrease"
      );

      // Verify escrow PDA received the funds
      const escrowBalance = await provider.connection.getBalance(escrowPda);
      assert.isAtLeast(
        escrowBalance,
        escrowAmount,
        "Escrow should hold the funds"
      );

      console.log("Escrow initialized successfully");
    });

    it("Fails to initialize escrow with zero amount", async () => {
      const zeroEscrowId = new anchor.BN(Date.now() + 1);
      const [zeroEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          zeroEscrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      try {
        await program.methods
          .initialize(new anchor.BN(0), zeroEscrowId)
          .accounts({
            depositor: depositor.publicKey,
            escrow: zeroEscrowPda,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();

        assert.fail("Should have failed with InvalidAmount error");
      } catch (error) {
        assert.include(
          error.message,
          "InvalidAmount",
          "Expected InvalidAmount error"
        );
        console.log("Correctly rejected zero amount");
      }
    });

    it("Fails to initialize duplicate escrow with same ID", async () => {
      try {
        // Try to create escrow with same ID again
        await program.methods
          .initialize(new anchor.BN(escrowAmount), escrowId)
          .accounts({
            depositor: depositor.publicKey,
            escrow: escrowPda,
            recipient: recipient.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();

        assert.fail("Should have failed - account already exists");
      } catch (error) {
        assert.include(
          error.message,
          "already in use",
          "Expected account already exists error"
        );
        console.log("Correctly rejected duplicate escrow ID");
      }
    });
  });

  describe("Claim Escrow", () => {
    let claimEscrowId: anchor.BN;
    let claimEscrowPda: PublicKey;

    before(async () => {
      // Create a new escrow for claim tests
      claimEscrowId = new anchor.BN(Date.now() + 100);
      [claimEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          claimEscrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(escrowAmount), claimEscrowId)
        .accounts({
          depositor: depositor.publicKey,
          escrow: claimEscrowPda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();
    });

    it("Successfully claims escrow funds", async () => {
      // Get balances before
      const recipientBalanceBefore = await provider.connection.getBalance(
        recipient.publicKey
      );

      // Claim the escrow
      const tx = await program.methods
        .claim()
        .accounts({
          recipient: recipient.publicKey,
          depositor: depositor.publicKey,
          escrow: claimEscrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([recipient])
        .rpc();

      console.log("Transaction signature:", tx);

      // Verify recipient received funds
      const recipientBalanceAfter = await provider.connection.getBalance(
        recipient.publicKey
      );
      assert.isAtLeast(
        recipientBalanceAfter,
        recipientBalanceBefore + escrowAmount,
        "Recipient should receive escrow funds"
      );

      // Verify escrow account is closed
      try {
        await program.account.escrow.fetch(claimEscrowPda);
        assert.fail("Escrow account should be closed");
      } catch (error) {
        assert.include(
          error.message,
          "Account does not exist",
          "Escrow should be closed"
        );
      }

      console.log("Escrow claimed successfully");
    });

    it("Fails when wrong person tries to claim", async () => {
      // Create another escrow
      const wrongClaimEscrowId = new anchor.BN(Date.now() + 200);
      const [wrongClaimEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          wrongClaimEscrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(escrowAmount), wrongClaimEscrowId)
        .accounts({
          depositor: depositor.publicKey,
          escrow: wrongClaimEscrowPda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      // Try to claim with wrong person
      try {
        await program.methods
          .claim()
          .accounts({
            recipient: wrongPerson.publicKey,
            depositor: depositor.publicKey,
            escrow: wrongClaimEscrowPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongPerson])
          .rpc();

        assert.fail("Should have failed with UnauthorizedClaim error");
      } catch (error) {
        assert.include(
          error.message,
          "UnauthorizedClaim",
          "Expected UnauthorizedClaim error"
        );
        console.log("Correctly rejected unauthorized claim");
      }
    });

    it("Fails to claim already claimed escrow", async () => {
      try {
        // Try to claim the first escrow again (already claimed)
        await program.methods
          .claim()
          .accounts({
            recipient: recipient.publicKey,
            depositor: depositor.publicKey,
            escrow: claimEscrowPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([recipient])
          .rpc();

        assert.fail("Should have failed - escrow already closed");
      } catch (error) {
        assert.include(
          error.message,
          "Account does not exist",
          "Expected account not found error"
        );
        console.log("Correctly rejected double claim");
      }
    });
  });

  describe("Cancel Escrow", () => {
    let cancelEscrowId: anchor.BN;
    let cancelEscrowPda: PublicKey;

    before(async () => {
      // Create a new escrow for cancel tests
      cancelEscrowId = new anchor.BN(Date.now() + 300);
      [cancelEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          cancelEscrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(escrowAmount), cancelEscrowId)
        .accounts({
          depositor: depositor.publicKey,
          escrow: cancelEscrowPda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();
    });

    it("Successfully cancels escrow and refunds depositor", async () => {
      // Get balances before
      const depositorBalanceBefore = await provider.connection.getBalance(
        depositor.publicKey
      );

      // Cancel the escrow
      const tx = await program.methods
        .cancel()
        .accounts({
          depositor: depositor.publicKey,
          escrow: cancelEscrowPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      console.log("Transaction signature:", tx);

      // Verify depositor received refund
      const depositorBalanceAfter = await provider.connection.getBalance(
        depositor.publicKey
      );
      assert.isAtLeast(
        depositorBalanceAfter,
        depositorBalanceBefore + escrowAmount - 10000, // Account for tx fees
        "Depositor should receive refund"
      );

      // Verify escrow account is closed
      try {
        await program.account.escrow.fetch(cancelEscrowPda);
        assert.fail("Escrow account should be closed");
      } catch (error) {
        assert.include(
          error.message,
          "Account does not exist",
          "Escrow should be closed"
        );
      }

      console.log("Escrow cancelled successfully");
    });

    it("Fails when wrong person tries to cancel", async () => {
      // Create another escrow
      const wrongCancelEscrowId = new anchor.BN(Date.now() + 400);
      const [wrongCancelEscrowPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          wrongCancelEscrowId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      await program.methods
        .initialize(new anchor.BN(escrowAmount), wrongCancelEscrowId)
        .accounts({
          depositor: depositor.publicKey,
          escrow: wrongCancelEscrowPda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      // Try to cancel with wrong person
      try {
        await program.methods
          .cancel()
          .accounts({
            depositor: wrongPerson.publicKey,
            escrow: wrongCancelEscrowPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([wrongPerson])
          .rpc();

        assert.fail("Should have failed with UnauthorizedCancel error");
      } catch (error) {
        assert.include(
          error.message,
          "ConstraintHasOne",
          "Expected authorization error"
        );
        console.log("Correctly rejected unauthorized cancel");
      }
    });

    it("Fails to cancel already cancelled escrow", async () => {
      try {
        // Try to cancel the first escrow again (already cancelled)
        await program.methods
          .cancel()
          .accounts({
            depositor: depositor.publicKey,
            escrow: cancelEscrowPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([depositor])
          .rpc();

        assert.fail("Should have failed - escrow already closed");
      } catch (error) {
        assert.include(
          error.message,
          "Account does not exist",
          "Expected account not found error"
        );
        console.log("Correctly rejected double cancel");
      }
    });

    it("Recipient cannot claim after depositor cancels", async () => {
      // This test uses the already cancelled escrow
      try {
        await program.methods
          .claim()
          .accounts({
            recipient: recipient.publicKey,
            depositor: depositor.publicKey,
            escrow: cancelEscrowPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([recipient])
          .rpc();

        assert.fail("Should have failed - escrow was cancelled");
      } catch (error) {
        assert.include(
          error.message,
          "Account does not exist",
          "Expected account not found error"
        );
        console.log("   ✅ Correctly prevented claim after cancel");
      }
    });
  });

  describe("Multiple Escrows", () => {
    it("Depositor can create multiple escrows with different IDs", async () => {
      const escrow1Id = new anchor.BN(Date.now() + 500);
      const escrow2Id = new anchor.BN(Date.now() + 501);

      const [escrow1Pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          escrow1Id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [escrow2Pda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          depositor.publicKey.toBuffer(),
          escrow2Id.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      // Create first escrow
      await program.methods
        .initialize(new anchor.BN(escrowAmount / 2), escrow1Id)
        .accounts({
          depositor: depositor.publicKey,
          escrow: escrow1Pda,
          recipient: recipient.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      // Create second escrow
      await program.methods
        .initialize(new anchor.BN(escrowAmount / 2), escrow2Id)
        .accounts({
          depositor: depositor.publicKey,
          escrow: escrow2Pda,
          recipient: wrongPerson.publicKey, // Different recipient
          systemProgram: SystemProgram.programId,
        })
        .signers([depositor])
        .rpc();

      // Verify both exist
      const escrow1Account = await program.account.escrow.fetch(escrow1Pda);
      const escrow2Account = await program.account.escrow.fetch(escrow2Pda);

      assert.equal(
        escrow1Account.recipient.toString(),
        recipient.publicKey.toString()
      );
      assert.equal(
        escrow2Account.recipient.toString(),
        wrongPerson.publicKey.toString()
      );

      console.log("Multiple escrows created successfully");
    });
  });
});