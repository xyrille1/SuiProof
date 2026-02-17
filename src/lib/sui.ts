/**
 * Sui Blockchain Utility
 *
 * Handles Programmable Transaction Block (PTB) creation for anchoring media to Sui Network.
 * Part of the SuiProof 3-Layer Architecture (Consensus Layer).
 */

import { TransactionBlock } from "@mysten/sui.js/transactions";

export type AnchorMediaParams = {
  cid: string;
  fileHash: string;
  gps: string;
  agencyId: string;
};

/**
 * Create transaction block for anchoring media
 * Step 3 of the SuiProof Technical Flow
 *
 * @param params - The anchor parameters (CID, hash, GPS, agency)
 * @returns TransactionBlock object for wallet signing
 */
export function createAnchorMediaTransaction(params: AnchorMediaParams) {
  const { cid, fileHash, gps, agencyId } = params;

  // Get package ID from environment
  const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID;
  if (!packageId) {
    throw new Error(
      "Package ID not configured. Please set NEXT_PUBLIC_PACKAGE_ID in .env.local",
    );
  }

  // Create a new transaction block
  const txb = new TransactionBlock();

  // Convert strings to Uint8Array for Move
  const cidBytes = new TextEncoder().encode(cid);
  const hashBytes = Array.from(Buffer.from(fileHash, "hex"));
  const gpsBytes = new TextEncoder().encode(gps);
  const agencyBytes = new TextEncoder().encode(agencyId);

  // Call the Move function: suiproof::anchor_original_media
  txb.moveCall({
    target: `${packageId}::suiproof::anchor_original_media`,
    arguments: [
      txb.pure(Array.from(cidBytes)), // IPFS CID as vector<u8>
      txb.pure(hashBytes), // BLAKE2b hash as vector<u8>
      txb.pure(Array.from(gpsBytes)), // GPS coordinates as vector<u8>
      txb.pure(Array.from(agencyBytes)), // Agency ID as vector<u8>
    ],
  });

  return txb;
}

/**
 * Get the Sui explorer URL for a transaction
 * @param digest - Transaction digest
 * @param network - Network (mainnet, testnet, devnet)
 * @returns Explorer URL
 */
export function getSuiExplorerUrl(
  digest: string,
  network: string = "testnet",
): string {
  return `https://suiscan.xyz/${network}/tx/${digest}`;
}
