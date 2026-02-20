import { useEffect, useState } from "react";
import { getPinataUrl } from "../lib/pinata";
import { SuiClient } from "@mysten/sui.js";

export function useManifestFromSui(nftObjectId: string) {
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchManifest() {
      setLoading(true);
      setError(null);
      try {
        const client = new SuiClient({
          network: process.env.NEXT_PUBLIC_SUI_NETWORK,
        });
        const nft = await client.getObject({
          id: nftObjectId,
          options: { showContent: true },
        });
        // Adjust extraction below to match your NFT structure
        // Example assumes manifest is stored in nft.data.fields.manifest
        const manifestData = nft.data?.fields?.manifest || nft.data?.fields;
        // Debug log manifest fields
        console.log("Manifest Data:", manifestData);

        const ipfsCid =
          manifestData.ipfsCid ||
          manifestData.cid ||
          manifestData.imageCid ||
          manifestData.ipfs_cid ||
          manifestData.image_cid ||
          manifestData.media_cid ||
          manifestData.nft_cid;
        console.log("Extracted CID:", ipfsCid);
        const modalImageSrc = ipfsCid ? getPinataUrl(ipfsCid) : undefined;
        const manifest = {
          ...manifestData,
          modalImageSrc,
          ipfsCid,
          provenanceId: nftObjectId,
        };
        setManifest(manifest);
      } catch (e: any) {
        setError(e.message || "Failed to fetch manifest");
      } finally {
        setLoading(false);
      }
    }
    if (nftObjectId) fetchManifest();
  }, [nftObjectId]);

  return { manifest, loading, error };
}
