"use client";

import { useState, useRef, useTransition } from "react";
import {
  UploadCloud,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  MapPin,
  Building2,
  Clock,
  Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  verifyFileOnBlockchain,
  type BlockchainVerificationResult,
} from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import blake2b from "blake2b";
import { IPFSImage } from "@/components/ipfs-image";

function FileUploadZone({
  onFileSelect,
  isPending,
}: {
  onFileSelect: (file: File) => void;
  isPending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDropzoneClick = () => {
    if (!isPending) {
      inputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isPending) return;
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onClick={handleDropzoneClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="mt-8 border-2 border-dashed border-border rounded-3xl p-12 bg-card hover:border-primary/50 transition-all group cursor-pointer"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />
      <div className="flex flex-col items-center gap-4 text-muted-foreground group-hover:text-primary transition-colors">
        {isPending ? (
          <>
            <Loader2 className="text-5xl animate-spin" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              ANALYZING...
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="text-5xl" />
            <span className="text-sm font-semibold uppercase tracking-widest">
              Upload Media For Audit
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const AuditResult = ({
  result,
  fileName,
}: {
  result: BlockchainVerificationResult;
  fileName: string;
}) => {
  const getPinataUrl = (cid: string): string => {
    const gateway =
      process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
    return `https://${gateway}/ipfs/${cid}`;
  };

  if (result.verified && result.manifestData) {
    const data = result.manifestData;

    return (
      <Card className="bg-card p-8 rounded-3xl border-2 border-emerald-500/30 shadow-xl relative overflow-hidden">
        {/* Seal of Authenticity Badge */}
        <div className="absolute top-0 right-0 p-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/50">
              <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              SEAL OF AUTHENTICITY
            </div>
          </div>
        </div>

        <div className="mb-6 pr-24">
          <div className="inline-block bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
            ✓ Blockchain Verified
          </div>
          <h3 className="text-3xl font-bold mb-2 text-emerald-600 dark:text-emerald-400">
            Authentic Media Confirmed
          </h3>
          <p className="text-sm text-muted-foreground">
            This file matches its immutable <strong>"birth certificate"</strong> (MediaManifest) permanently anchored on the Sui Network.
          </p>
        </div>

        {/* IPFS Image Preview with Verification Badge */}
        {data.ipfsCid && (
          <div className="mb-6 rounded-xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800 shadow-lg">
            <div className="relative w-full aspect-video bg-black">
              <IPFSImage
                src={getPinataUrl(data.ipfsCid)}
                alt="Verified media"
                fill
                className="object-contain"
                priority
              />
              <div className="absolute top-3 left-3">
                <div className="bg-emerald-500/95 backdrop-blur-md text-white text-[11px] px-3 py-1.5 rounded-lg border border-white/30 font-bold shadow-lg flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  VERIFIED ON SUI BLOCKCHAIN
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Origin Story - Birth Certificate Details */}
        <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-950/30 dark:to-green-950/30 rounded-2xl p-5 mb-6 border-2 border-emerald-200/50 dark:border-emerald-900/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-600/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-widest">
              Origin Story — The Birth Certificate
            </h4>
          </div>
          <div className="space-y-3 text-sm pl-10">
            <div>
              <span className="text-muted-foreground">Captured by </span>
              <span className="font-bold text-foreground bg-white dark:bg-gray-900 px-2 py-0.5 rounded border">
                {data.agencyId}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Location Coordinates: </span>
                <code className="font-mono text-xs font-bold text-foreground bg-white dark:bg-gray-900 px-2 py-0.5 rounded border">
                  {data.gpsCoordinates}
                </code>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-muted-foreground">Anchored On-Chain: </span>
                <span className="font-bold text-foreground">
                  {data.createdAt}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata Details */}
        <div className="bg-muted/30 rounded-xl p-5 mb-6 border">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <Hash className="w-3.5 h-3.5" />
            Immutable Metadata & Cryptographic Proof
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-4 border-b pb-2">
              <span className="text-muted-foreground text-sm font-medium">Original File Name</span>
              <span className="font-mono text-xs text-foreground truncate max-w-[60%] text-right">
                {fileName}
              </span>
            </div>
            <div className="flex justify-between items-start gap-4 border-b pb-2">
              <span className="text-muted-foreground text-sm font-medium">IPFS Storage (CID)</span>
              <span className="font-mono text-xs text-foreground truncate max-w-[60%] text-right">
                {data.ipfsCid}
              </span>
            </div>
            <div className="flex justify-between items-start gap-4 border-b pb-2">
              <span className="text-muted-foreground text-sm font-medium">MediaManifest ID</span>
              <span className="font-mono text-xs text-foreground truncate max-w-[60%] text-right">
                {data.manifestId}
              </span>
            </div>
            <div className="flex justify-between items-start gap-4 border-b pb-2">
              <span className="text-muted-foreground text-sm font-medium">
                Creator (Publisher)
              </span>
              <span className="font-mono text-xs text-foreground truncate max-w-[60%] text-right">
                {data.creator}
              </span>
            </div>
            <div className="border-b pb-3">
              <div className="text-muted-foreground text-sm font-medium mb-2 flex items-center gap-2">
                Content Hash (BLAKE2b-512)
              </div>
              <code className="font-mono text-[10px] text-foreground break-all bg-black/5 dark:bg-white/5 px-3 py-2 rounded block border">
                {data.contentHash}
              </code>
              <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                ℹ️ Even a single pixel change would produce a completely different hash
              </p>
            </div>
          </div>
        </div>

        {/* Future: Edit History / Lineage (Coming Soon) */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-xl p-4 mb-6 border border-blue-200 dark:border-blue-900">
          <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Edit History & Lineage
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>This is the original Genesis version.</strong> Future versions will show edit history via <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">parent_id</code> tracking, allowing you to trace cropped or edited versions back to their source.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl font-bold text-sm"
            onClick={() =>
              window.open(
                `https://suiscan.xyz/${process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet"}/object/${data.manifestId}`,
                "_blank",
              )
            }
          >
            View on Sui Explorer
          </Button>
          {data.ipfsCid && (
            <Button
              variant="outline"
              className="flex-1 rounded-xl font-bold text-sm"
              onClick={() =>
                window.open(
                  `https://gateway.pinata.cloud/ipfs/${data.ipfsCid}`,
                  "_blank",
                )
              }
            >
              View on IPFS
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-8 rounded-3xl border-2 border-red-300 dark:border-red-900/50 relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 p-6 opacity-10">
        <AlertTriangle className="w-24 h-24 text-red-500" />
      </div>

      <div className="relative">
        <div className="inline-block bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
          ⚠️ Metadata Mismatch
        </div>
        <h3 className="text-3xl font-bold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-8 h-8" />
          Unverified Content
        </h3>

        <p className="text-red-700 dark:text-red-400 text-sm mb-6 leading-relaxed max-w-2xl">
          {result.error ||
            "This file's cryptographic hash does not match any MediaManifest on the Sui Network. It may be tampered, unregistered, or from an untrusted source."}
        </p>

        {/* What This Means */}
        <div className="bg-red-100 dark:bg-red-950/40 rounded-2xl p-5 mb-6 border-2 border-red-300 dark:border-red-900">
          <h4 className="text-sm font-bold text-red-900 dark:text-red-200 uppercase tracking-widest mb-3">
            What This Means — No "Birth Certificate" Found
          </h4>
          <ul className="text-sm text-red-800 dark:text-red-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>No blockchain record:</strong> This file hash does not exist in any MediaManifest on the Sui Network</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Possible tampering:</strong> Even a single pixel change produces a completely different hash</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Potential synthetic media:</strong> Could be AI-generated or deepfake content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-600 font-bold">•</span>
              <span><strong>Not from verified publisher:</strong> No linkage to a registered News Agency or PressPass</span>
            </li>
          </ul>
        </div>

        {/* Trustless Verification Note */}
        <div className="bg-white/50 dark:bg-black/20 rounded-xl p-4 mb-6 border border-red-200 dark:border-red-900">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-2">
            Why Trustless Verification Matters
          </h4>
          <p className="text-xs text-muted-foreground">
            Because the "birth certificates" (MediaManifests) are stored on Sui's immutable blockchain — not in a central database — this negative result is just as trustworthy as a positive match. No one can hide, delete, or forge blockchain records.
          </p>
        </div>

        {/* Warning Banner */}
        <div className="flex items-center gap-3 p-5 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl shadow-lg">
          <AlertTriangle className="w-6 h-6 text-white flex-shrink-0 animate-pulse" />
          <span className="font-bold text-sm text-white">
            PROCEED WITH CAUTION — AUTHENTICITY CANNOT BE VERIFIED ON-CHAIN
          </span>
        </div>
      </div>
    </Card>
  );
};

export function VerifierView() {
  const [auditResult, setAuditResult] =
    useState<BlockchainVerificationResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    setFileName(file.name);

    // Step 1: Local Hash Generation (BLAKE2b)
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = () => {
      startTransition(async () => {
        setAuditResult(null);

        try {
          // Generate BLAKE2b hash locally
          const fileContent = reader.result as ArrayBuffer;
          const hash = blake2b(64)
            .update(new Uint8Array(fileContent))
            .digest("hex");

          toast({
            title: "Step 1/2: Hash Generated",
            description: "Generated BLAKE2b hash locally",
          });

          // Step 2: Query Sui Network
          toast({
            title: "Step 2/2: Querying Blockchain",
            description:
              "Searching for matching MediaManifest on Sui Network...",
          });

          const result = await verifyFileOnBlockchain(hash);

          setAuditResult(result);

          if (result.verified) {
            toast({
              title: "✓ Verification Complete",
              description: "File authenticity confirmed on blockchain",
            });
          } else {
            toast({
              title: "Verification Complete",
              description: "No matching record found on blockchain",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Verification error:", error);
          toast({
            variant: "destructive",
            title: "Verification Failed",
            description:
              error instanceof Error ? error.message : "Unknown error occurred",
          });
        }
      });
    };

    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      toast({
        variant: "destructive",
        title: "File Read Error",
        description: "There was a problem reading your file.",
      });
    };
  };

  return (
    <section className="space-y-12 py-12">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <div className="inline-block">
          <div className="bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-4">
            🌐 Trustless Public Verifier
          </div>
        </div>
        <h2 className="text-4xl font-extrabold text-foreground tracking-tight">
          Your Digital Notary for Media Authenticity
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Verify any media file against its immutable "birth certificate" on the Sui blockchain.
          No central authority. No trusted database. Just cryptographic proof.
        </p>

        {/* Trustless Explainer */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl p-6 text-left max-w-2xl mx-auto border border-blue-200 dark:border-blue-900">
          <h3 className="font-bold text-sm mb-3 text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Why You Can Trust This Verification
          </h3>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">No Central Database:</strong> Media manifests live permanently on Sui's blockchain—not on our servers. Even we cannot delete or modify them.
            </p>
            <p>
              <strong className="text-foreground">Open Access:</strong> Any developer can build their own verifier using Sui's public API. You don't have to trust us—you can trust the smart contract code itself.
            </p>
            <p>
              <strong className="text-foreground">Real-time & Parallel:</strong> Verification happens in milliseconds thanks to Sui's parallel transaction processing.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-muted/50 rounded-xl p-6 text-left max-w-2xl mx-auto border">
          <h3 className="font-bold text-sm mb-3 text-foreground">
            The Cryptographic Handshake (3 Steps)
          </h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Local Hash Generation</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  BLAKE2b hash computed <em>in your browser</em>. Your file never leaves your device during verification.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Query Sui Network</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Read-only search for a MediaManifest where <code className="bg-muted px-1 rounded">content_hash == [Your File Hash]</code>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground">Seal of Authenticity</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  If match found: Display the immutable "birth certificate" with origin, GPS, timestamp, and agency ID.
                </p>
              </div>
            </div>
          </div>
        </div>
        <FileUploadZone onFileSelect={handleFileSelect} isPending={isPending} />
      </div>

      {auditResult && (
        <div className="max-w-4xl mx-auto mt-12 animate-in fade-in-50 duration-500">
          <AuditResult result={auditResult} fileName={fileName} />
        </div>
      )}
    </section>
  );
}
