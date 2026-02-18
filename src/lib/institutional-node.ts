/**
 * Institutional Node API Client
 *
 * This module provides functions to communicate with the institutional node
 * for sponsored transactions (Phase 2: "Shutter Click" workflow)
 */

import type { NodeHealth, NodeStats, NodeTransaction } from "./data";

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

/**
 * Get detailed node information including health, config, and sponsor details
 */
export async function getNodeInfo(): Promise<NodeHealth> {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/info`);
    const data = await response.json();

    return {
      status: response.ok ? "healthy" : "down",
      service: data.service || "SuiProof Institutional Node",
      network: data.network || "testnet",
      sponsorAddress: data.sponsor || "0x...",
      agencyName: data.agencyName,
      agencyId: data.agencyId,
    };
  } catch (error) {
    return {
      status: "down",
      service: "SuiProof Institutional Node",
      network: "unknown",
      sponsorAddress: "0x...",
    };
  }
}

/**
 * Get aggregated statistics about the institutional node
 * Note: This requires backend implementation in Phase 2
 */
export async function getNodeStats(): Promise<NodeStats> {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/api/stats`);

    if (response.ok) {
      return await response.json();
    }

    // Fallback mock data if endpoint not yet implemented
    return {
      totalTransactions: 0,
      gasSpent: 0,
      activeJournalists: 0,
      mediaAnchored: 0,
      avgCostPerTx: 0,
    };
  } catch (error) {
    // Return empty stats on error
    return {
      totalTransactions: 0,
      gasSpent: 0,
      activeJournalists: 0,
      mediaAnchored: 0,
      avgCostPerTx: 0,
    };
  }
}

/**
 * Get recent transactions sponsored by the institutional node
 * Note: This requires backend implementation in Phase 2
 */
export async function getRecentTransactions(
  limit: number = 20,
): Promise<NodeTransaction[]> {
  try {
    const nodeUrl =
      process.env.NEXT_PUBLIC_INSTITUTIONAL_NODE_URL || "http://localhost:3001";

    const response = await fetch(`${nodeUrl}/api/transactions?limit=${limit}`);

    if (response.ok) {
      return await response.json();
    }

    // Return empty array if endpoint not yet implemented
    return [];
  } catch (error) {
    return [];
  }
}
