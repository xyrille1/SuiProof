/**
 * Pinata IPFS Utility
 *
 * This utility handles uploading files to Pinata IPFS and retrieving them.
 * Part of the SuiProof 3-Layer Architecture (Storage Layer).
 */

export type PinataUploadResponse = {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
};

/**
 * Upload a file to Pinata IPFS
 * @param file - The file to upload
 * @returns Promise with the IPFS CID and metadata
 */
export async function uploadToPinata(
  file: File,
): Promise<PinataUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // Add custom metadata
  const metadata = JSON.stringify({
    name: file.name,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      source: "SuiProof",
    },
  });
  formData.append("pinataMetadata", metadata);

  // Add options
  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append("pinataOptions", options);

  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error("Pinata JWT not configured");
  }

  const response = await fetch(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Get the Pinata gateway URL for an IPFS CID
 * @param cid - The IPFS CID
 * @returns The gateway URL
 */
export function getPinataUrl(cid: string): string {
  const gateway =
    process.env.NEXT_PUBLIC_PINATA_GATEWAY || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${cid}`;
}

/**
 * Generate BLAKE2b hash from file
 * @param file - The file to hash
 * @returns Promise with hex-encoded hash
 */
export async function generateBlake2bHash(file: File): Promise<string> {
  // This will be imported in the component to avoid server-side issues
  const blake2b = (await import("blake2b")).default;

  return new Promise((resolve, reject) => {
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
}
