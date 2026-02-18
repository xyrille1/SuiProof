"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Video } from "lucide-react";
import { MediaManifest } from "@/lib/data";
import { IPFSImage } from "@/components/ipfs-image";
import { useWallet } from "@suiet/wallet-kit";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { NewAnchorModal } from "./new-anchor-modal";

const StatCard = ({
  title,
  value,
  subtext,
  subtextBadge,
  valueColor,
}: {
  title: string;
  value: string;
  subtext?: string;
  subtextBadge?: string;
  valueColor?: string;
}) => (
  <Card className="shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold" style={{ color: valueColor }}>
        {value}
      </div>
      {subtext && (
        <div className="flex items-center gap-2">
          <p className="text-2xl font-bold">{subtext}</p>
          {subtextBadge && (
            <Badge
              variant="secondary"
              className="bg-blue-100 text-primary-600 font-bold uppercase"
            >
              {subtextBadge}
            </Badge>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

type DashboardViewProps = {
  onViewManifest: (provenanceId: string) => void;
  mediaManifests: MediaManifest[];
  onCreateAnchor: (
    file: File,
    gps: string,
    agencyId: string,
    useSponsored?: boolean,
  ) => Promise<void>;
};

export function DashboardView({
  onViewManifest,
  mediaManifests,
  onCreateAnchor,
}: DashboardViewProps) {
  const { connected } = useWallet();
  const { toast } = useToast();
  const [isNewAnchorModalOpen, setIsNewAnchorModalOpen] = useState(false);

  const handleNewAnchor = () => {
    if (!connected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a new anchor.",
      });
    } else {
      setIsNewAnchorModalOpen(true);
    }
  };

  return (
    <section className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Media Manifests
          </h1>
          <p className="text-muted-foreground">
            Managing immutable birth certificates for field footage.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleNewAnchor}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> New Anchor
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Your Anchors"
          value={mediaManifests.length.toString()}
        />
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-emerald-600">
                {mediaManifests.filter((m) => m.status === "Verified").length}
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
              {mediaManifests.filter((m) => m.status === "Pending").length >
                0 && (
                <>
                  <div className="text-muted-foreground">/</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      mediaManifests.filter((m) => m.status === "Pending")
                        .length
                    }
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Security Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">TEE-Level</p>
              <Badge
                variant="outline"
                className="text-xs uppercase font-bold border-blue-300 bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
              >
                BLAKE2b
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {mediaManifests.length === 0 ? (
        <Card className="shadow-sm overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              No Anchors Yet
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Start creating blockchain-verified media anchors by clicking the
              "+ New Anchor" button above. Your anchored media will appear here
              with real-time verification status.
            </p>
            <Button
              onClick={handleNewAnchor}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" /> Create Your First Anchor
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider w-[40%]">
                  Content
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Status
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Provenance ID
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider">
                  Captured
                </TableHead>
                <TableHead className="px-6 py-4 text-xs font-bold uppercase text-muted-foreground tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border text-sm">
              {mediaManifests.map((item) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden relative flex-shrink-0">
                        {item.type === "image" && item.imageSrc ? (
                          <IPFSImage
                            src={item.imageSrc}
                            alt={item.fileName}
                            width={48}
                            height={48}
                            className="object-cover w-full h-full"
                            data-ai-hint={item.imageHint}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <Video />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground italic">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    {item.status === "Verified" ? (
                      <Badge
                        variant="outline"
                        className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                      >
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-emerald-500 animate-seal-pulse"></span>
                        Verified
                      </Badge>
                    ) : item.status === "Unverified" ? (
                      <Badge
                        variant="outline"
                        className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                      >
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-red-500"></span>
                        Unverified
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
                      >
                        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <code className="text-xs font-code bg-muted px-2 py-1 rounded text-muted-foreground">
                      {item.provenanceId}
                    </code>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-muted-foreground">
                    <time>{item.captured}</time>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    {item.status === "Verified" ? (
                      <Button
                        variant="link"
                        className="text-primary p-0 h-auto"
                        onClick={() => onViewManifest(item.provenanceId)}
                      >
                        View Certificate
                      </Button>
                    ) : item.status === "Unverified" ? (
                      <span className="text-red-600 dark:text-red-400 text-sm font-medium">
                        Not Found
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        Verifying...
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {isNewAnchorModalOpen && (
        <NewAnchorModal
          open={isNewAnchorModalOpen}
          onClose={() => setIsNewAnchorModalOpen(false)}
          onCreateAnchor={onCreateAnchor}
        />
      )}
    </section>
  );
}
