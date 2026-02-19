"use client";


import { WalletProvider, slushWallet } from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css";
import { ReactNode } from "react";


export default function SuiWalletProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WalletProvider supportedWallets={[slushWallet]}>
      {children}
    </WalletProvider>
  );
}
