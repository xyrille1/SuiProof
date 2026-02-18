"use server";

import { SuiJsonRpcClient, type SuiEvent } from "@mysten/sui/jsonRpc";
import {
  contentVerificationExplanation,
  type ContentVerificationExplanationOutput,
} from "@/ai/flows/content-verification-explanation";

// Types for blockchain verification
export type BlockchainVerificationResult = {
  verified: boolean;
  manifestData?: {
    manifestId: string;
    ipfsCid: string;
    contentHash: string;
    gpsCoordinates: string;
    agencyId: string;
    creator: string;
    createdAt: string;
  };
  error?: string;
};

export async function getVerificationResult(
  mediaDataUri: string,
): Promise<ContentVerificationExplanationOutput> {
  try {
    const result = await contentVerificationExplanation({ mediaDataUri });
    return result;
  } catch (error) {
    console.error("Error in content verification flow:", error);
    // Return a structured error response that the client can handle
    return {
      isVerified: false,
      explanation:
        "An unexpected error occurred during the audit. Please try again.",
    };
  }
}

/**
 * Server Action: Upload file to Pinata IPFS
 * Step 2 of the SuiProof Technical Flow
 */
export async function uploadFileToPinata(formData: FormData): Promise<{
  success: boolean;
  cid?: string;
  error?: string;
}> {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    if (!jwt) {
      return { success: false, error: "Pinata JWT not configured" };
    }

    // Create FormData for Pinata
    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedAt: new Date().toISOString(),
        source: "SuiProof",
      },
    });
    pinataFormData.append("pinataMetadata", metadata);

    // Add options
    const options = JSON.stringify({
      cidVersion: 1,
    });
    pinataFormData.append("pinataOptions", options);

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        body: pinataFormData,
      },
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Pinata upload error:", error);
      return { success: false, error: `Upload failed: ${response.statusText}` };
    }

    const data = await response.json();
    return { success: true, cid: data.IpfsHash };
  } catch (error) {
    console.error("Error uploading to Pinata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Server Action: Verify file against Sui blockchain
 * Queries for MediaAnchored events matching the content hash
 */
export async function verifyFileOnBlockchain(
  contentHashHex: string,
): Promise<BlockchainVerificationResult> {
  try {
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet";
    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;

    if (!packageId) {
      return {
        verified: false,
        error: "Package ID not configured",
      };
    }

    // Initialize Sui client
    const suiClient = new SuiJsonRpcClient({
      url:
        network === "mainnet"
          ? "https://fullnode.mainnet.sui.io:443"
          : "https://fullnode.testnet.sui.io:443",
      network: network as "mainnet" | "testnet",
    });

    // Query for MediaAnchored events
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType: `${packageId}::suiproof::MediaAnchored`,
      },
      limit: 1000, // Get recent events
    });

    // Find matching event by content_hash_hex
    const matchingEvent = events.data.find((event: SuiEvent) => {
      const parsedData = event.parsedJson as {
        content_hash_hex?: string;
      };
      return parsedData.content_hash_hex === contentHashHex;
    });

    if (matchingEvent) {
      const eventData = matchingEvent.parsedJson as {
        manifest_id: string;
        ipfs_cid: string;
        content_hash_hex: string;
        gps_coordinates: string;
        agency_id: string;
        creator: string;
        created_at: string;
      };

      // Format timestamp
      const timestamp = parseInt(eventData.created_at);
      const date = new Date(timestamp);

      return {
        verified: true,
        manifestData: {
          manifestId: eventData.manifest_id,
          ipfsCid: eventData.ipfs_cid,
          contentHash: eventData.content_hash_hex,
          gpsCoordinates: eventData.gps_coordinates,
          agencyId: eventData.agency_id,
          creator: eventData.creator,
          createdAt: date.toUTCString(),
        },
      };
    }

    return {
      verified: false,
      error: "No matching MediaManifest found on blockchain",
    };
  } catch (error) {
    console.error("Error verifying on blockchain:", error);
    return {
      verified: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
