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
