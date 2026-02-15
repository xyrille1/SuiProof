'use client';
import type { View } from '@/app/page';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Shield, Wallet } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SuiProofLogoIcon = ({ className }: { className?: string }) => (
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-[linear-gradient(135deg,_#4da2ff_0%,_#32629b_100%)] text-white", className)}>
        <Shield className="w-5 h-5" />
    </div>
);

type HeaderProps = {
  currentView: View;
  onNavigate: (view: View) => void;
};

const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export function Header({ currentView, onNavigate }: HeaderProps) {
  const navItemClasses = (view: View) =>
    cn(
      "hover:text-primary transition-colors",
      currentView === view ? "text-primary" : "text-muted-foreground"
    );

  const { isConnected, account, connectWallet, disconnectWallet } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SuiProofLogoIcon />
          <span className="text-xl font-bold tracking-tight text-foreground">
            Sui<span className="text-primary">Proof</span>
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
          <button onClick={() => onNavigate('dashboard')} className={navItemClasses('dashboard')}>
            Journalist Dashboard
          </button>
          <button onClick={() => onNavigate('verify')} className={navItemClasses('verify')}>
            Public Verifier
          </button>
          <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
            Institutional Node
          </a>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/70">
              Gas Sponsored By
            </span>
            <span className="text-xs font-semibold text-foreground">
              Associated Press (AP)
            </span>
          </div>
          
          {isConnected && account ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-secondary hover:bg-muted"
                >
                  <Wallet className="mr-2 h-4 w-4 text-primary" />
                  {truncateAddress(account)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={disconnectWallet}>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              className="rounded-full bg-foreground hover:bg-foreground/80 text-background"
              onClick={connectWallet}
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Slush Wallet
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
