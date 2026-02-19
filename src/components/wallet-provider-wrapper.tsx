"use client";

import dynamic from "next/dynamic";
import { ReactNode, useState, useEffect } from "react";

// Dynamically import WalletProvider with SSR disabled to avoid "self is not defined" error
const WalletProvider = dynamic(() => import("@/components/wallet-provider"), {
  ssr: false,
  loading: () => <div>Loading wallet...</div>,
});

export default function WalletProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <WalletProvider>{children}</WalletProvider>;
}
