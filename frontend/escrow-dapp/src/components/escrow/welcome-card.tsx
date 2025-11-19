'use client'

import { WalletButton } from '../solana/solana-provider'

const WelcomeCard = () => {
  return (
    <div className="text-center py-20">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-white mb-4">Welcome</h2>
        <p className="text-zinc-200 mb-6">Connect your wallet to create and manage escrows</p>
        <WalletButton />
      </div>
    </div>
  )
}

export default WelcomeCard
