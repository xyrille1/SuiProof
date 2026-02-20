import { useManifestFromSui } from "../hooks/use-manifest-from-sui";
import { ManifestModal } from "../components/manifest-modal";

export function SlushAssetAnchorViewer({
  nftObjectId,
}: {
  nftObjectId: string;
}) {
  const { manifest, loading, error } = useManifestFromSui(nftObjectId);

  if (loading) return <div>Loading anchor...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!manifest) return <div>No anchor found.</div>;

  return <ManifestModal manifest={manifest} onClose={() => {}} />;
}
