'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Network = 'mainnet' | 'testnet';

// Let's assume a global 'slush' object is injected by the wallet extension
declare global {
  interface Window {
    slush?: {
      connect: () => Promise<string[]>;
      getAccounts: () => Promise<string[]>;
      on: (event: 'accountsChanged' | 'networkChanged', callback: (data: any) => void) => void;
      removeListener: (event: string, callback: (data: any) => void) => void;
      getNetwork?: () => Promise<Network>;
    };
  }
}

interface WalletContextType {
  isConnected: boolean;
  account: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  walletInstalled: boolean;
  network: Network | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<string | null>(null);
  const [walletInstalled, setWalletInstalled] = useState(false);
  const [network, setNetwork] = useState<Network | null>(null);

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

  const handleNetworkChanged = useCallback((newNetwork: Network) => {
    setNetwork(newNetwork);
  }, []);

  useEffect(() => {
    if (walletInstalled && window.slush) {
        const checkNetwork = async () => {
          if (window.slush?.getNetwork) {
            try {
              const net = await window.slush.getNetwork();
              handleNetworkChanged(net);
            } catch (e) {
              console.error("Could not get network, defaulting to testnet", e);
              setNetwork('testnet');
            }
          } else {
            setNetwork('testnet');
          }
        };

        window.slush.getAccounts()
            .then(handleAccountsChanged)
            .catch(console.error);
        
        checkNetwork();
        
        const accountsChangedHandler = (accounts: string[]) => handleAccountsChanged(accounts);
        const networkChangedHandler = (network: Network) => handleNetworkChanged(network);
        
        window.slush.on('accountsChanged', accountsChangedHandler);
        if (window.slush.on) {
            window.slush.on('networkChanged', networkChangedHandler);
        }

        return () => {
            window.slush?.removeListener('accountsChanged', accountsChangedHandler);
            if (window.slush?.removeListener) {
              window.slush.removeListener('networkChanged', networkChangedHandler);
            }
        };
    }
  }, [walletInstalled, handleAccountsChanged, handleNetworkChanged]);

  const connectWallet = async () => {
    if (!walletInstalled || !window.slush) {
      alert('Slush Wallet is not installed. Please install it to continue.');
      window.open('https://slushwallet.io', '_blank');
      return;
    }
    try {
      const accounts = await window.slush.connect();
      handleAccountsChanged(accounts);
      if (window.slush?.getNetwork) {
        const net = await window.slush.getNetwork();
        handleNetworkChanged(net);
      } else {
        setNetwork('testnet');
      }
    } catch (error) {
      console.error('Failed to connect to Slush Wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount(null);
    setNetwork(null);
  };

  const value = {
    isConnected,
    account,
    connectWallet,
    disconnectWallet,
    walletInstalled,
    network
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
