'use client'
import { PublicKey } from '@solana/web3.js'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { EscrowAccount } from '../../hooks/useEscrow'

export interface EscrowTransactionsInterface {
  escrowsAsDepositor: EscrowAccount[]
  escrowsAsRecipient: EscrowAccount[]
  handleClaim: (depositor: PublicKey, escrowPda: PublicKey) => Promise<void>
  handleCancel: (escrowPda: PublicKey) => Promise<void>
  refresh: () => Promise<void>
  loading: boolean
}

const EscrowTransactions = ({
  escrowsAsDepositor,
  escrowsAsRecipient,
  handleClaim,
  handleCancel,
  refresh,
  loading,
}: EscrowTransactionsInterface) => {
  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Escrows as Depositor */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Created by You</h2>
          <button onClick={refresh} disabled={loading} className="text-zinc-200 hover:text-white transition">
            🔄 Refresh
          </button>
        </div>
        {escrowsAsDepositor.length === 0 ? (
          <p className="text-zinc-200 text-center py-8">No escrows created yet</p>
        ) : (
          <div className="space-y-4">
            {escrowsAsDepositor.map((escrow) => (
              <div key={escrow.publicKey.toString()} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">Recipient</p>
                    <p className="text-white font-mono text-xs break-all">
                      {escrow.recipient.toString().slice(0, 8)}...
                      {escrow.recipient.toString().slice(-8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{(escrow.amount / LAMPORTS_PER_SOL).toFixed(3)} SOL</p>
                  </div>
                </div>
                <button
                  onClick={() => handleCancel(escrow.publicKey)}
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold transition disabled:opacity-50"
                >
                  Cancel & Refund
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Escrows as Recipient */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Sent to You</h2>
          <button onClick={refresh} disabled={loading} className="text-zinc-200 hover:text-white transition">
            🔄 Refresh
          </button>
        </div>
        {escrowsAsRecipient.length === 0 ? (
          <p className="text-zinc-200 text-center py-8">No escrows received yet</p>
        ) : (
          <div className="space-y-4">
            {escrowsAsRecipient.map((escrow) => (
              <div key={escrow.publicKey.toString()} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm text-zinc-200">From</p>
                    <p className="text-white font-mono text-xs break-all">
                      {escrow.depositor.toString().slice(0, 8)}...
                      {escrow.depositor.toString().slice(-8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{(escrow.amount / LAMPORTS_PER_SOL).toFixed(3)} SOL</p>
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(escrow.depositor, escrow.publicKey)}
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-200 font-semibold transition disabled:opacity-50"
                >
                  Claim Funds
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default EscrowTransactions
