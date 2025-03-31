"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export default function ConnectWallet() {
  const { publicKey, disconnect } = useWallet();

  return (
    <div>
      <WalletMultiButton /> {/* Built-in wallet button */}
      {publicKey && (
        <p>Connected as: {publicKey.toBase58()}</p>
      )}
    </div>
  );
}
