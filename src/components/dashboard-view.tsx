'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Video } from 'lucide-react';
import { mediaManifests } from '@/lib/data';
import Image from 'next/image';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from './ui/toast';

const StatCard = ({ title, value, subtext, subtextBadge, valueColor }: { title: string, value: string, subtext?: string, subtextBadge?: string, valueColor?: string }) => (
  <Card className="shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold" style={{ color: valueColor }}>{value}</div>
      {subtext && 
        <div className="flex items-center gap-2">
            <p className="text-2xl font-bold">{subtext}</p>
            {subtextBadge && <Badge variant="secondary" className="bg-blue-100 text-primary-600 font-bold uppercase">{subtextBadge}</Badge>}
        </div>
      }
    </CardContent>
  </Card>
);

type DashboardViewProps = {
  onViewManifest: (provenanceId: string) => void;
};

export function DashboardView({ onViewManifest }: DashboardViewProps) {
  const { isConnected, connectWallet } = useWallet();
  const { toast } = useToast();

  const handleNewAnchor = () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a new anchor.",
        action: <ToastAction altText="Connect" onClick={connectWallet}>Connect Wallet</ToastAction>
      });
    } else {
      // TODO: Implement actual "New Anchor" flow
      toast({
        title: "Wallet Connected",
        description: "You can now proceed to create a new anchor.",
      });
    }
  };

  return (
    <section className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Media Manifests</h1>
          <p className="text-muted-foreground">Managing immutable birth certificates for field footage.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleNewAnchor} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> New Anchor
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="On-Chain Anchors" value="1,284" />
        <StatCard title="Avg. Anchoring Speed" value="2.1s" valueColor="hsl(142.1 76.2% 36.3%)" />
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Security Grade</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold">TEE-Level</p>
                    <Badge variant="outline" className="text-xs uppercase font-bold border-blue-300 bg-blue-100 text-blue-700">BLAKE2b</Badge>
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider w-[40%]">Content</TableHead>
              <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Status</TableHead>
              <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Provenance ID</TableHead>
              <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">Captured</TableHead>
              <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border text-sm">
            {mediaManifests.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors group">
                <TableCell className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden relative flex-shrink-0">
                      {item.type === 'image' && item.imageSrc ? (
                        <Image src={item.imageSrc} alt={item.fileName} width={48} height={48} className="object-cover w-full h-full" data-ai-hint={item.imageHint}/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <Video/>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{item.fileName}</p>
                      <p className="text-xs text-muted-foreground italic">{item.description}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-6 py-4">
                  {item.status === 'Verified' ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-seal-pulse"></span>
                      Verified
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground italic">Pending...</span>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <code className="text-xs font-code bg-muted px-2 py-1 rounded text-muted-foreground">{item.provenanceId}</code>
                </TableCell>
                <TableCell className="px-6 py-4 text-muted-foreground">
                  <time>{item.captured}</time>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  {item.status === 'Verified' ? (
                    <Button variant="link" className="text-primary p-0 h-auto" onClick={() => onViewManifest(item.provenanceId)}>
                      View Certificate
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">Processing</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
