"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { MediaManifest } from "@/lib/data";
import { DashboardView } from "@/components/dashboard-view";
import { VerifierView } from "@/components/verifier-view";
import { ManifestModal } from "@/components/manifest-modal";
import { useWallet } from "@suiet/wallet-kit";
import { useToast } from "@/hooks/use-toast";
import { uploadFileToPinata, verifyFileOnBlockchain } from "@/app/actions";
import { createAnchorMediaTransaction } from "@/lib/sui";
import { requestSponsoredAnchor } from "@/lib/institutional-node";
import blake2b from "blake2b";

// Dynamically import Header to avoid SSR issues with wallet kit
const Header = dynamic(
  () => import("@/components/header").then((mod) => ({ default: mod.Header })),
  {
    ssr: false,
  },
);

// Dynamically import InstitutionalNodeView to avoid SSR issues
const InstitutionalNodeView = dynamic(
  () =>
    import("@/components/institutional-node-view").then((mod) => ({
      default: mod.InstitutionalNodeView,
    })),
  {
    ssr: false,
  },
);

export type View = "dashboard" | "verify" | "institutional";

/**
 * LocalStorage key for persisting user's created manifests
 * This allows manifests to survive page refreshes
 */
const MANIFESTS_STORAGE_KEY = "suiproof_user_manifests";

/**
 * Get Pinata gateway URL for displaying images
 */
function getPinataUrl(cid: string): string {
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}

/**
 * Load manifests from localStorage
 * Returns only user-created manifests (no mock data)
 */
function loadManifestsFromStorage(): MediaManifest[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(MANIFESTS_STORAGE_KEY);
    if (stored) {
      const userManifests: MediaManifest[] = JSON.parse(stored);
      return userManifests;
    }
  } catch (error) {
    console.error("Error loading manifests from storage:", error);
  }

  return [];
}

/**
 * Save user-created manifests to localStorage
 */
function saveManifestsToStorage(manifests: MediaManifest[]) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(MANIFESTS_STORAGE_KEY, JSON.stringify(manifests));
  } catch (error) {
    console.error("Error saving manifests to storage:", error);
  }
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedManifest, setSelectedManifest] =
    useState<MediaManifest | null>(null);

  /**
   * PERSISTENCE FIX: Load manifests from localStorage on mount
   * This solves the issue where newly created manifests disappear on page refresh
   *
   * HOW IT WORKS:
   * 1. On page load, we check localStorage for user-created manifests
   * 2. We merge them with the default demo manifests
   * Load manifests from localStorage on mount
   * No mock data - only real user-created manifests
   *
   * STATUS VERIFICATION:
   * - Initially loaded as "Pending"
   * - Background verification checks blockchain
   * - Updates status to "Verified" or "Unverified" based on blockchain query
   */
  const [mediaManifests, setMediaManifests] = useState<MediaManifest[]>(() =>
    loadManifestsFromStorage(),
  );

  const wallet = useWallet();
  const { toast } = useToast();

  /**
   * Verify manifest status against blockchain (only for Pending items)
   * Runs once on mount for efficiency
   */
  useEffect(() => {
    async function verifyManifestStatuses() {
      // Only verify manifests with "Pending" status
      const pendingManifests = mediaManifests.filter(
        (m) => m.status === "Pending",
      );

      if (pendingManifests.length === 0) return;

      const updatedManifests = await Promise.all(
        mediaManifests.map(async (manifest) => {
          // Skip if already verified or unverified
          if (manifest.status !== "Pending") {
            return manifest;
          }

          try {
            const result = await verifyFileOnBlockchain(
              manifest.metadata.contentHash,
            );
            return {
              ...manifest,
              status: result.verified
                ? ("Verified" as const)
                : ("Unverified" as const),
            };
          } catch (error) {
            console.error("Error verifying manifest:", error);
            return {
              ...manifest,
              status: "Unverified" as const,
            };
          }
        }),
      );

      // Update state only if there were pending items
      setMediaManifests(updatedManifests);
    }

    if (
      mediaManifests.length > 0 &&
      mediaManifests.some((m) => m.status === "Pending")
    ) {
      verifyManifestStatuses();
    }
  }, []); // Run only once on mount

  /**
   * Save manifests to localStorage whenever they change
   * This ensures persistence across page refreshes
   */
  useEffect(() => {
    saveManifestsToStorage(mediaManifests);
  }, [mediaManifests]);

  const handleViewManifest = (provenanceId: string) => {
    const manifest = mediaManifests.find(
      (m) => m.provenanceId === provenanceId,
    );
    if (manifest) {
      setSelectedManifest(manifest);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedManifest(null);
  };

  /**
   * Complete "+ New Anchor" Flow
   * Supports two modes:
   * 1. INSTITUTIONAL SPONSORSHIP (Phase 2: "Shutter Click")
   *    - Sends request to institutional node
   *    - Node sponsors the transaction (pays gas)
   *    - Journalist receives confirmation
   *
   * 2. DIRECT WALLET (Traditional)
   *    - Creates PTB locally
   *    - User signs with wallet
   *    - User pays gas
   *
   * Implements the 4-step SuiProof Technical Flow:
   * 1. Client-Side Preparation (BLAKE2b hashing)
   * 2. Pinning to Pinata (get CID)
   * 3. Transaction Authorization
   * 4. Sui Verification (on-chain minting)
   */
  const handleCreateAnchor = async (
    file: File,
    gps: string,
    agencyId: string,
    useSponsored: boolean = true,
  ) => {
    try {
      // STEP 1: Client-Side Preparation - Generate BLAKE2b hash
      toast({
        title: "Step 1/4: Hashing File",
        description: "Generating BLAKE2b hash of your media...",
      });

      const fileHash = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const fileContent = event.target?.result;
            if (fileContent) {
              const hash = blake2b(64)
                .update(new Uint8Array(fileContent as ArrayBuffer))
                .digest("hex");
              resolve(hash);
            } else {
              reject(new Error("Failed to read file"));
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error("File reading failed"));
        reader.readAsArrayBuffer(file);
      });

      // STEP 2: Pinning to Pinata - Upload to IPFS
      toast({
        title: "Step 2/4: Uploading to IPFS",
        description: "Pinning your media to Pinata...",
      });

      const formData = new FormData();
      formData.append("file", file);
      const uploadResult = await uploadFileToPinata(formData);

      if (!uploadResult.success || !uploadResult.cid) {
        throw new Error(uploadResult.error || "Failed to upload to Pinata");
      }

      const ipfsCid = uploadResult.cid;

      let transactionDigest: string;
      let manifestId: string | undefined;

      if (useSponsored) {
        // ===== INSTITUTIONAL SPONSORSHIP MODE =====
        // Phase 2: "Shutter Click" workflow
        toast({
          title: "Step 3/4: Requesting Sponsorship",
          description: "Institutional node sponsoring your transaction...",
        });

        // Check if wallet is connected (needed for journalist address)
        if (!wallet.connected || !wallet.account) {
          throw new Error("Please connect your wallet first");
        }

        // Send request to institutional node
        const sponsorResult = await requestSponsoredAnchor({
          ipfsCid: ipfsCid,
          contentHash: fileHash,
          gpsCoordinates: gps || "N/A",
          agencyId: agencyId || "N/A",
          journalistAddress: wallet.account.address,
        });

        if (!sponsorResult.success) {
          throw new Error(
            sponsorResult.error || "Institutional node sponsorship failed",
          );
        }

        transactionDigest = sponsorResult.transactionDigest!;
        manifestId = sponsorResult.manifestId;

        toast({
          title: "Step 4/4: Transaction Sponsored!",
          description: `Fee paid by ${sponsorResult.sponsoredBy?.slice(0, 6)}...`,
        });
      } else {
        // ===== DIRECT WALLET MODE =====
        // Traditional blockchain interaction
        toast({
          title: "Step 3/4: Creating Transaction",
          description: "Please approve the transaction in your wallet...",
        });

        // Check if wallet is connected
        if (!wallet.connected || !wallet.account) {
          throw new Error("Please connect your wallet first");
        }

        const tx = createAnchorMediaTransaction({
          cid: ipfsCid,
          fileHash: fileHash,
          gps: gps || "N/A",
          agencyId: agencyId || "N/A",
        });

        // Sign and execute the transaction using Suiet wallet
        const result = await wallet.signAndExecuteTransactionBlock({
          transactionBlock: tx,
        });

        transactionDigest =
          result.digest ||
          result.effects?.transactionDigest ||
          `0x${Math.random().toString(16).slice(2)}`;

        toast({
          title: "Step 4/4: Minting On-Chain",
          description: "MediaManifest object created on Sui Network!",
        });
      }

      // Create the new manifest with Pinata CID
      const newManifest: MediaManifest = {
        id: manifestId || Date.now().toString(),
        fileName: file.name,
        type: "image",
        status: "Verified", // Transaction success = verified on blockchain
        provenanceId: transactionDigest,
        captured: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        description: '"Original Master"',
        // Use Pinata gateway URLs for display
        imageSrc: getPinataUrl(ipfsCid),
        imageHint: `Image stored on IPFS: ${ipfsCid}`,
        modalImageSrc: getPinataUrl(ipfsCid),
        modalImageHint: `Image stored on IPFS: ${ipfsCid}`,
        ipfsCid: ipfsCid, // Store the CID
        metadata: {
          gps: gps || "N/A",
          agencyId: agencyId || "N/A",
          contentHash: fileHash,
          captureDate: new Date().toUTCString(),
        },
      };

      /**
       * PERSISTENCE: Add to manifests list (prepend for newest first)
       * The useEffect hook will automatically save this to localStorage
       * This ensures the manifest survives page refreshes
       */
      setMediaManifests([newManifest, ...mediaManifests]);

      toast({
        title: useSponsored
          ? "✓ Anchor Created (Institution Sponsored)!"
          : "✓ Anchor Created Successfully!",
        description: `Verified on blockchain with IPFS CID: ${ipfsCid.slice(0, 12)}...`,
      });
    } catch (error) {
      console.error("Error creating anchor:", error);
      toast({
        title: "Error Creating Anchor",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header currentView={view} onNavigate={setView} />
      <main
        id="main-content"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full"
      >
        {view === "dashboard" && (
          <DashboardView
            onViewManifest={handleViewManifest}
            mediaManifests={mediaManifests}
            onCreateAnchor={handleCreateAnchor}
          />
        )}
        {view === "verify" && <VerifierView />}
        {view === "institutional" && <InstitutionalNodeView />}
      </main>
      {isModalOpen && selectedManifest && (
        <ManifestModal manifest={selectedManifest} onClose={handleCloseModal} />
      )}
    </div>
  );
}
