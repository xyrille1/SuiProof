/**
 * Institutional Node API Client
 *
 * This module provides functions to communicate with the institutional node
 * for sponsored transactions (Phase 2: "Shutter Click" workflow)
 */

export type SponsoredAnchorRequest = {
  ipfsCid: string;
  contentHash: string; // BLAKE2b hash in hex
  gpsCoordinates: string;
  agencyId: string;
  journalistAddress: string;
  pressPassId?: string;
};

export type SponsoredAnchorResponse = {
  success: boolean;
  transactionDigest?: string;
  manifestId?: string;
  explorerUrl?: string;
  sponsoredBy?: string;
  error?: string;
  message?: string;
};

/**
 * Submit a media anchoring request to the institutional node
 * The node will sponsor the transaction (pay gas) on behalf of the journalist
 *
 * @param request - Media anchoring details
 * @returns Transaction result
 */
export async function requestSponsoredAnchor(
  request: SponsoredAnchorRequest,
): Promise<SponsoredAnchorResponse> {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/api/anchor-media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // In production, add authentication header
        // 'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to anchor media",
        message: data.message,
      };
    }

    return data;
  } catch (error) {
    console.error("Error communicating with institutional node:", error);
    return {
      success: false,
      error: "Network error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Register a news agency on-chain
 * This is a Phase 1 operation typically done once
 */
export async function registerAgency(name: string, agencyId: string) {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/api/register-agency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, agencyId }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Issue a press pass to a journalist
 * This is a Phase 1 operation done by agency admins
 */
export async function issuePressPass(
  agencyObjectId: string,
  journalistAddress: string,
  journalistName: string,
  expiresAt: number = 0,
) {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/api/issue-press-pass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agencyObjectId,
        journalistAddress,
        journalistName,
        expiresAt,
      }),
    });

    return await response.json();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check institutional node health status
 */
export async function checkNodeHealth() {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/health`);
    return await response.json();
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
