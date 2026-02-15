'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Let's assume a global 'slush' object is injected by the wallet extension
declare global {
  interface Window {
    slush?: {
      connect: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      on: (event: string, callback: (accounts: string[]) => void) => void;
      removeListener: (event: string, callback: (accounts: string[]) => void) => void;
    };
  }
}

interface WalletContextType {
  isConnected: boolean;
  account: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  walletInstalled: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [walletInstalled, setWalletInstalled] = useState(false);

  useEffect(() => {
    setWalletInstalled(typeof window.slush !== 'undefined');
  }, []);

  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setIsConnected(true);
    } else {
      setAccount(null);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (walletInstalled && window.slush) {
        // Check for already connected accounts on load
        window.slush.getAccounts()
            .then(handleAccountsChanged)
            .catch(console.error);
        
        // Listen for account changes
        window.slush.on('accountsChanged', handleAccountsChanged);

        return () => {
            window.slush?.removeListener('accountsChanged', handleAccountsChanged);
        };
    }
  }, [walletInstalled, handleAccountsChanged]);

  const connectWallet = async () => {
    if (!walletInstalled || !window.slush) {
      alert('Slush Wallet is not installed. Please install it to continue.');
      // Maybe open a new tab to the install page
      window.open('https://slushwallet.io', '_blank');
      return;
    }
    try {
      const accounts = await window.slush.connect();
      handleAccountsChanged(accounts);
    } catch (error) {
      console.error('Failed to connect to Slush Wallet:', error);
    }
  };

  const disconnectWallet = () => {
    // Wallets usually don't have a programmatic disconnect. 
    // The user disconnects from the wallet extension itself.
    // We'll just clear our app state.
    setIsConnected(false);
    setAccount(null);
  };

  const value = {
    isConnected,
    account,
    connectWallet,
    disconnectWallet,
    walletInstalled
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
