import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from '@clerk/nextjs';
import {Appbar} from "@/components/ui/Appbar";
import {WalletProvider} from './WalletContext';
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Validate-me - Web3 Powered Uptime Monitoring',
  description: 'Monitor your services with blockchain-grade reliability using Solana tokens',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <WalletProvider>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="uptimechain-theme"
          >
            <ClerkProvider>
              <Appbar/>
              {children}
          </ClerkProvider>
        </ThemeProvider>
      </body>
      </WalletProvider>
    </html>
  );
}