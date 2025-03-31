"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Shield, Wallet, Zap, Clock, Lock, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useWallet } from "./WalletContext";
import { useUser } from "@clerk/nextjs";

export default function Home() {
  const {user, isLoaded} = useUser();
  const { walletAddress, connectWallet } = useWallet();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative overflow-hidden bg-gradient-to-b from-purple-900/20 to-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="container mx-auto px-4 py-24 relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center space-x-2 bg-purple-500/10 rounded-full px-4 py-2 border border-purple-500/20">
                <Activity className="h-5 w-5 text-purple-400" />
                <span className="text-purple-400 font-medium">Web3 Powered Monitoring</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-white">
                Monitor Your Services with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                  Blockchain Security
                </span>
              </h1>
              
              <p className="text-xl text-muted-foreground max-w-xl">
                Experience enterprise-grade uptime monitoring powered by Solana. Get rewarded in tokens for maintaining high availability.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={connectWallet}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {walletAddress
                    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
                    : (
                      <>
                        Connect <Wallet className="ml-2 h-5 w-5" />
                      </>
                    )
                  }
                </Button>

                
  
                <Link href='/Dashboard'>
                  <Button size="lg" variant="outline" className="border-purple-500/20 hover:bg-purple-500/10">
                    Monitor Sites
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-purple-400">99.99%</h3>
                  <p className="text-muted-foreground">Uptime SLA</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-purple-400">50ms</h3>
                  <p className="text-muted-foreground">Response Time</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-purple-400">10k+</h3>
                  <p className="text-muted-foreground">Active Monitors</p>
                </div>
              </div>
            </div>

            <div className="relative h-[600px] hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-purple-700/20 rounded-lg border border-purple-500/20 backdrop-blur-sm">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image
                    src="https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=1000"
                    alt="Blockchain visualization"
                    width={800}
                    height={600}
                    className="rounded-lg object-cover opacity-60 mix-blend-luminosity"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

     
      <div className="container mx-auto px-4 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 bg-card border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <Shield className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Blockchain Security</h3>
            <p className="text-muted-foreground">
              Leverage Solana's security for immutable uptime records and transparent monitoring.
            </p>
          </Card>
          <Card className="p-6 bg-card border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <Zap className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Real-time Alerts</h3>
            <p className="text-muted-foreground">
              Instant notifications when your services need attention, secured by smart contracts.
            </p>
          </Card>
          <Card className="p-6 bg-card border-purple-500/20 hover:border-purple-500/40 transition-colors">
            <Clock className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Pay-Per-Monitor</h3>
            <p className="text-muted-foreground">
              Only pay for what you use with automatic Solana token payments.
            </p>
          </Card>
        </div>
      </div>

     
      <div className="container mx-auto px-4 py-24">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join the future of decentralized monitoring. Connect your wallet and start protecting your services today.
          </p>
            {user ? (
              <Link href={`/user/${user.id}`}>
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white">
                  <Lock className="mr-2 h-5 w-5" />
                  Start Monitoring
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="bg-gray-500 text-white" disabled>
                <Lock className="mr-2 h-5 w-5" />
                Sign In to Monitor
              </Button>
          )}

        </div>
      </div>

      <footer className="border-t border-purple-500/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-purple-400" />
              <span className="font-semibold">UptimeChain</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 UptimeChain. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
