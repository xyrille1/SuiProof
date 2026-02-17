import type { ImagePlaceholder } from "./placeholder-images";
import { PlaceHolderImages } from "./placeholder-images";

const getImage = (id: string): ImagePlaceholder | undefined =>
  PlaceHolderImages.find((img) => img.id === id);

export type MediaManifest = {
  id: string;
  fileName: string;
  type: "image" | "video";
  status: "Verified" | "Pending";
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

export const mediaManifests: MediaManifest[] = [
  {
    id: "1",
    fileName: "Election_Rally_01.jpg",
    type: "image",
    status: "Verified",
    provenanceId: "0x7d2a...f4e1",
    captured: "2 mins ago",
    description: '"Original Master"',
    imageSrc: getImage("news-rally")?.imageUrl || "",
    imageHint: getImage("news-rally")?.imageHint || "",
    modalImageSrc: getImage("news-rally-large")?.imageUrl || "",
    modalImageHint: getImage("news-rally-large")?.imageHint || "",
    metadata: {
      gps: "40.7128N, 74.0060W",
      agencyId: "SUI_AP_091",
      contentHash: "6b8a1c927f62d10912177f1166782a20b1277f1166782a20",
      captureDate: "Oct 24, 2023 • 14:22:01 UTC",
    },
  },
  {
    id: "2",
    fileName: "Live_Interview_Clip.mp4",
    type: "video",
    status: "Pending",
    provenanceId: "0x3b1c...99aa",
    captured: "14 mins ago",
    description: "Linked to: 0x92b...11",
    imageSrc: "",
    imageHint: "",
    modalImageSrc: "",
    modalImageHint: "",
    metadata: {
      gps: "",
      agencyId: "",
      contentHash: "",
      captureDate: "",
    },
  },
  {
    id: "3",
    fileName: "Protest_Coverage.jpg",
    type: "image",
    status: "Verified",
    provenanceId: "0x8c4e...a2b3",
    captured: "1 hour ago",
    description: '"Original Master"',
    imageSrc: getImage("protest-coverage")?.imageUrl || "",
    imageHint: getImage("protest-coverage")?.imageHint || "",
    modalImageSrc: getImage("protest-coverage-large")?.imageUrl || "",
    modalImageHint: getImage("protest-coverage-large")?.imageHint || "",
    metadata: {
      gps: "34.0522° N, 118.2437° W",
      agencyId: "SUI_REUTERS_045",
      contentHash: "d4e8a1b927c6f2d10912177f1166782a20b1277f1166782b",
      captureDate: "Oct 24, 2023 • 13:05:30 UTC",
    },
  },
];
