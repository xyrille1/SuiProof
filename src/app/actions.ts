"use server";

import {
  contentVerificationExplanation,
  type ContentVerificationExplanationOutput,
} from "@/ai/flows/content-verification-explanation";

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
