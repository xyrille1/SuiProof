/**
 * Sui Blockchain Utility
 *
 * Handles Programmable Transaction Block (PTB) creation for anchoring media to Sui Network.
 * Part of the SuiProof 3-Layer Architecture (Consensus Layer).
 */

import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";

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
 * @returns Transaction object for wallet signing
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
  const txb = new Transaction();

  // Convert strings to arrays for BCS serialization
  const cidBytes = Array.from(new TextEncoder().encode(cid));
  const hashBytes = Array.from(new Uint8Array(Buffer.from(fileHash, "hex")));
  const gpsBytes = Array.from(new TextEncoder().encode(gps));
  const agencyBytes = Array.from(new TextEncoder().encode(agencyId));

  // Call the Move function: suiproof::anchor_original_media
  txb.moveCall({
    target: `${packageId}::suiproof::anchor_original_media`,
    arguments: [
      txb.pure(bcs.vector(bcs.U8).serialize(cidBytes).toBytes()), // IPFS CID as vector<u8>
      txb.pure(bcs.vector(bcs.U8).serialize(hashBytes).toBytes()), // BLAKE2b hash as vector<u8>
      txb.pure(bcs.vector(bcs.U8).serialize(gpsBytes).toBytes()), // GPS coordinates as vector<u8>
      txb.pure(bcs.vector(bcs.U8).serialize(agencyBytes).toBytes()), // Agency ID as vector<u8>
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
