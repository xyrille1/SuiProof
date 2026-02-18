/**
 * MediaManifest Type Definition
 * Represents an anchored media file with blockchain verification
 */
export type MediaManifest = {
  id: string;
  fileName: string;
  type: "image" | "video";
  status: "Verified" | "Unverified" | "Pending";
  provenanceId: string;
  captured: string;
  description: string;
  lineageLink?: string;
  imageSrc: string;
  imageHint: string;
  modalImageSrc: string;
  modalImageHint: string;
  ipfsCid?: string; // Pinata IPFS CID
  metadata: {
    gps: string;
    agencyId: string;
    contentHash: string;
    captureDate: string;
  };
};

/**
 * Institutional Node Types
 */
export type NodeTransaction = {
  id: string;
  timestamp: number;
  type: "anchor" | "press-pass" | "agency";
  journalist: string;
  gasCost: number;
  txDigest: string;
  status: "success" | "pending" | "failed";
  details?: {
    ipfsCid?: string;
    gps?: string;
    agencyId?: string;
  };
};

export type NodeStats = {
  totalTransactions: number;
  gasSpent: number;
  activeJournalists: number;
  mediaAnchored: number;
  avgCostPerTx: number;
};

export type NodeHealth = {
  status: "healthy" | "warning" | "down";
  service: string;
  network: string;
  sponsorAddress: string;
  balance?: number;
  agencyName?: string;
  agencyId?: string;
};
