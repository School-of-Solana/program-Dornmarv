'use client'
import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'

export interface CreateEscrowFormInterface {
  message: { type: 'success' | 'error'; text: string } | null
  handleCreate: (recipient: string, amountSol: number) => Promise<{ signature: string; escrowPda: PublicKey }>
  loading: boolean;
}

const CreatEscrowForm = ({ message, handleCreate, loading }: CreateEscrowFormInterface) => {
  const [recipientAddress, setRecipientAddress] = useState('')
  const [amount, setAmount] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleCreate(recipientAddress, parseFloat(amount))
    setRecipientAddress('')
    setAmount('')
  }

  return (
    <>
      {/* Status Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500 text-green-100'
              : 'bg-red-500/20 border border-red-500 text-red-100'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Create Escrow Form */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-6">Create New Escrow</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-200 mb-2">Recipient Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Enter recipient's wallet address"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-300/50 focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-zinc-200 mb-2">Amount (SOL)</label>
            <input
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-zinc-300/50 focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Creating...' : 'Create Escrow'}
          </button>
        </form>
      </div>
    </>
  )
}

export default CreatEscrowForm
