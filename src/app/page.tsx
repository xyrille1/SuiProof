"use client";

import { useState, useEffect } from "react";
import type { MediaManifest } from "@/lib/data";
import { mediaManifests as initialMediaManifests } from "@/lib/data";
import { Header } from "@/components/header";
import { DashboardView } from "@/components/dashboard-view";
import { VerifierView } from "@/components/verifier-view";
import { ManifestModal } from "@/components/manifest-modal";
import { useWallet } from "@suiet/wallet-kit";
import { useToast } from "@/hooks/use-toast";
import { uploadFileToPinata } from "@/app/actions";
import { createAnchorMediaTransaction } from "@/lib/sui";
import blake2b from "blake2b";

export type View = "dashboard" | "verify";

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
 * Combines default manifests with user-created manifests
 */
function loadManifestsFromStorage(): MediaManifest[] {
  if (typeof window === "undefined") return initialMediaManifests;

  try {
    const stored = localStorage.getItem(MANIFESTS_STORAGE_KEY);
    if (stored) {
      const userManifests: MediaManifest[] = JSON.parse(stored);
      // Merge user manifests with initial manifests (user manifests first)
      return [...userManifests, ...initialMediaManifests];
    }
  } catch (error) {
    console.error("Error loading manifests from storage:", error);
  }

  return initialMediaManifests;
}

/**
 * Save user-created manifests to localStorage
 * Only saves manifests that are not in the initial set
 */
function saveManifestsToStorage(manifests: MediaManifest[]) {
  if (typeof window === "undefined") return;

  try {
    // Filter out the default manifests, only save user-created ones
    const userManifests = manifests.filter(
      (m) => !initialMediaManifests.some((initial) => initial.id === m.id),
    );
    localStorage.setItem(MANIFESTS_STORAGE_KEY, JSON.stringify(userManifests));
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
   * 3. When user creates a new anchor, we save it to localStorage
   * 4. On next page load, the user's manifests are restored
   *
   * FUTURE IMPROVEMENT:
   * Instead of localStorage, we should query the Sui blockchain for:
   * - MediaManifest objects owned by the connected wallet
   * - Use SuiClient.getOwnedObjects() filtered by type
   * - This would make data truly decentralized and multi-device
   */
  const [mediaManifests, setMediaManifests] = useState<MediaManifest[]>(() =>
    loadManifestsFromStorage(),
  );

  const wallet = useWallet();
  const { toast } = useToast();

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
   * Implements the 4-step SuiProof Technical Flow:
   * 1. Client-Side Preparation (BLAKE2b hashing)
   * 2. Pinning to Pinata (get CID)
   * 3. Slush Wallet Authorization (PTB)
   * 4. Sui Verification (on-chain minting)
   */
  const handleCreateAnchor = async (
    file: File,
    gps: string,
    agencyId: string,
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

      // STEP 3: Slush Wallet Authorization - Create and sign PTB
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

      // STEP 4: Sui Verification - Transaction confirmed
      toast({
        title: "Step 4/4: Minting On-Chain",
        description: "MediaManifest object created on Sui Network!",
      });

      // Get the transaction digest
      const transactionDigest =
        result.digest ||
        result.effects?.transactionDigest ||
        `0x${Math.random().toString(16).slice(2)}`;

      // Create the new manifest with Pinata CID
      const newManifest: MediaManifest = {
        id: (mediaManifests.length + 1).toString(),
        fileName: file.name,
        type: "image",
        status: "Verified",
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
        title: "Anchor Created Successfully!",
        description: `Your media is now permanently anchored on Sui Network with IPFS CID: ${ipfsCid.slice(0, 12)}...`,
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
      </main>
      {isModalOpen && selectedManifest && (
        <ManifestModal manifest={selectedManifest} onClose={handleCloseModal} />
      )}
    </div>
  );
}
