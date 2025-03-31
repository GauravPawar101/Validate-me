"use client";
import { createContext, useContext, useState, useEffect } from "react";

type WalletContextType = {
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    if ("solana" in window) {
      const provider = (window as any).solana;
      if (provider?.isPhantom) {
        provider.connect({ onlyIfTrusted: true }).then((response: any) => {
          setWalletAddress(response.publicKey.toString());
        }).catch(() => {});
      }
    }
  }, []);

  const connectWallet = async () => {
    try {
      if ("solana" in window) {
        const provider = (window as any).solana;
        if (provider?.isPhantom) {
          const response = await provider.connect();
          setWalletAddress(response.publicKey.toString());
        } else {
          alert("Phantom Wallet not found!");
        }
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  return (
    <WalletContext.Provider value={{ walletAddress, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
