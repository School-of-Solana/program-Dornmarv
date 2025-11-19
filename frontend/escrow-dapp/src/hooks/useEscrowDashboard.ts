import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { useEscrow, EscrowAccount } from './useEscrow';

export type Message = { type: 'success' | 'error'; text: string } | null;

export const useEscrowDashboard = () => {
  const { publicKey } = useWallet();
  const { createEscrow, claimEscrow, cancelEscrow, fetchEscrows, loading } = useEscrow();

  const [escrowsAsDepositor, setEscrowsAsDepositor] = useState<EscrowAccount[]>([]);
  const [escrowsAsRecipient, setEscrowsAsRecipient] = useState<EscrowAccount[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const loadEscrows = useCallback(async () => {
    if (!publicKey) return;
    setRefreshing(true);
    try {
      const { asDepositor, asRecipient } = await fetchEscrows();
      setEscrowsAsDepositor(asDepositor);
      setEscrowsAsRecipient(asRecipient);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load escrows' });
    } finally {
      setRefreshing(false);
    }
  }, [publicKey, fetchEscrows]);

  useEffect(() => {
    if (publicKey) loadEscrows();
  }, [publicKey, loadEscrows]);

  const handleCreate = async (recipient: string, amountSol: number) => {
    setMessage(null);
    try {
      const result = await createEscrow(recipient, amountSol);
      setMessage({ type: 'success', text: `Escrow created! ${result.signature.slice(0, 8)}...` });
      await loadEscrows();
      return result;
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create escrow' });
      throw error;
    }
  };

  const handleClaim = async (depositor: PublicKey, escrowPda: PublicKey) => {
    setMessage(null);
    try {
      const tx = await claimEscrow(depositor, escrowPda);
      setMessage({ type: 'success', text: `Claimed! ${tx.slice(0, 8)}...` });
      await loadEscrows();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to claim' });
      throw error;
    }
  };

  const handleCancel = async (escrowPda: PublicKey) => {
    setMessage(null);
    try {
      const tx = await cancelEscrow(escrowPda);
      setMessage({ type: 'success', text: `Cancelled! ${tx.slice(0, 8)}...` });
      await loadEscrows();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to cancel' });
      throw error;
    }
  };

  const clearMessage = () => setMessage(null);

  return {
    escrowsAsDepositor,
    escrowsAsRecipient,
    loading: loading || refreshing,
    message,
    clearMessage,
    handleCreate,
    handleClaim,
    handleCancel,
    refresh: loadEscrows,
  };
};