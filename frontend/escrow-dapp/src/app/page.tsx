'use client'

import { useEscrowDashboard } from '@/hooks/useEscrowDashboard'
import { useWallet } from '@solana/wallet-adapter-react'
import EscrowTransactions from '@/components/escrow/escrow-transactions'
import CreatEscrowForm from '@/components/escrow/create-escrow-form'
import Header from '@/components/escrow/header'
import WelcomeCard from '@/components/escrow/welcome-card'

export default function Home() {
  const { publicKey } = useWallet()

  const { escrowsAsDepositor, escrowsAsRecipient, loading, message, handleCreate, handleClaim, handleCancel, refresh } =
    useEscrowDashboard()

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Header />

        {!publicKey ? (
          <WelcomeCard />
        ) : (
          <>
            <CreatEscrowForm message={message} handleCreate={handleCreate} loading={loading} />

            <EscrowTransactions
              escrowsAsDepositor={escrowsAsDepositor}
              escrowsAsRecipient={escrowsAsRecipient}
              handleClaim={handleClaim}
              handleCancel={handleCancel}
              refresh={refresh}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  )
}
