/**
 * Institutional Node - Phase 2: "Shutter Click" Sponsorship Service
 *
 * This service receives anchoring requests from journalists and sponsors their
 * transactions on the Sui blockchain. The institutional node:
 *
 * 1. Receives media data (hash, GPS, metadata) from journalist's mobile app
 * 2. Validates the journalist's credentials (optional: check PressPass)
 * 3. Creates a Programmable Transaction Block (PTB)
 * 4. Signs and sponsors the transaction (pays the gas)
 * 5. Executes on Sui Network
 * 6. Returns confirmation to the journalist
 */

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { bcs } from "@mysten/sui/bcs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Sui Client
const suiClient = new SuiClient({
  url: process.env.SUI_RPC_URL || "https://fullnode.testnet.sui.io:443",
});

// Initialize sponsor keypair (institution's wallet that pays gas)
// Note: In production, use a more secure key management system
if (
  !process.env.SPONSOR_PRIVATE_KEY ||
  process.env.SPONSOR_PRIVATE_KEY === "YOUR_PRIVATE_KEY_HERE"
) {
  console.error("❌ ERROR: SPONSOR_PRIVATE_KEY not set in .env file");
  console.error("");
  console.error("Please run: sui keytool export --key-identity <your-address>");
  console.error("Then update institutional-node/.env with the exported key");
  process.exit(1);
}

let sponsorKeypair;
try {
  // Decode the Sui private key (format: suiprivkey1q...)
  const parsed = decodeSuiPrivateKey(process.env.SPONSOR_PRIVATE_KEY);
  sponsorKeypair = Ed25519Keypair.fromSecretKey(parsed.secretKey);
} catch (error) {
  console.error("❌ ERROR: Invalid SPONSOR_PRIVATE_KEY format");
  console.error("Expected format: suiprivkey1q... (from sui keytool export)");
  console.error("");
  console.error("Run: sui keytool export --key-identity <your-address>");
  console.error(
    "Error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
console.log(`🏛️  Institutional Node initialized`);
console.log(`📍 Sponsor Address: ${sponsorAddress}`);
console.log(`🌐 Network: ${process.env.SUI_NETWORK}`);
console.log(`📦 Package ID: ${process.env.PACKAGE_ID}`);

// =====================================================
// Transaction History (In-Memory Storage)
// =====================================================

type TransactionRecord = {
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
    journalistName?: string;
  };
};

const transactionHistory: TransactionRecord[] = [];
const journalistSet = new Set<string>(); // Track unique journalists

function recordTransaction(record: TransactionRecord) {
  transactionHistory.unshift(record); // Add to beginning for most recent first

  // Track unique journalists
  if (record.journalist) {
    journalistSet.add(record.journalist);
  }

  // Keep only last 1000 transactions to prevent memory issues
  if (transactionHistory.length > 1000) {
    transactionHistory.pop();
  }

  console.log(
    `   📊 Transaction recorded: ${record.type} - ${record.txDigest}`,
  );
}

function calculateGasCost(effects: any): number {
  try {
    // Extract gas used from transaction effects
    if (effects?.gasUsed) {
      const computationCost = parseInt(effects.gasUsed.computationCost || 0);
      const storageCost = parseInt(effects.gasUsed.storageCost || 0);
      const storageRebate = parseInt(effects.gasUsed.storageRebate || 0);

      // Total gas = computation + storage - rebate, convert from MIST to SUI
      return (computationCost + storageCost - storageRebate) / 1_000_000_000;
    }
  } catch (error) {
    console.warn("Could not calculate gas cost:", error);
  }
  return 0.001; // Fallback estimate
}

/**
 * Load historical transactions from the Sui blockchain
 * This function queries all past transactions from the sponsor address
 * and populates the transaction history
 */
async function loadHistoricalTransactions() {
  console.log("\n🔍 Loading historical transactions from blockchain...");

  try {
    // Query transactions from the sponsor address
    const txnResponse = await suiClient.queryTransactionBlocks({
      filter: { FromAddress: sponsorAddress },
      options: {
        showEffects: true,
        showEvents: true,
        showInput: true,
      },
      limit: 50, // Load last 50 transactions
    });

    console.log(`   Found ${txnResponse.data.length} transactions`);

    // Process each transaction
    for (const txBlock of txnResponse.data) {
      try {
        // Determine transaction type from the move call
        let txType: "anchor" | "press-pass" | "agency" | null = null;
        let journalist = sponsorAddress;
        let details: any = {};

        // Parse transaction input to determine type
        if (
          txBlock.transaction?.data?.transaction?.kind ===
          "ProgrammableTransaction"
        ) {
          const programmableTx = txBlock.transaction.data.transaction;
          const commands = programmableTx.transactions || [];

          for (const command of commands) {
            // Check if this is a MoveCall transaction
            if ("MoveCall" in command) {
              const moveCall = (command as any).MoveCall;
              const functionName = moveCall.function;

              // Identify transaction type by function name
              if (functionName === "anchor_original_media") {
                txType = "anchor";
              } else if (functionName === "issue_press_pass") {
                txType = "press-pass";
              } else if (functionName === "register_agency") {
                txType = "agency";
              }
            }
          }
        }

        // Only record relevant transactions
        if (txType) {
          const record: TransactionRecord = {
            id: txBlock.digest,
            timestamp: txBlock.timestampMs
              ? parseInt(txBlock.timestampMs)
              : Date.now(),
            type: txType,
            journalist: journalist,
            gasCost: calculateGasCost(txBlock.effects),
            txDigest: txBlock.digest,
            status:
              txBlock.effects?.status?.status === "success"
                ? "success"
                : "failed",
            details,
          };

          // Add to history (but don't log each one to avoid spam)
          transactionHistory.push(record);

          if (record.journalist && record.journalist !== sponsorAddress) {
            journalistSet.add(record.journalist);
          }
        }
      } catch (error) {
        console.warn(
          `   ⚠️  Could not parse transaction ${txBlock.digest}:`,
          error,
        );
      }
    }

    // Sort by timestamp (most recent first)
    transactionHistory.sort((a, b) => b.timestamp - a.timestamp);

    console.log(
      `   ✅ Loaded ${transactionHistory.length} relevant transactions`,
    );
    console.log(
      `   📊 Stats: ${transactionHistory.filter((t) => t.type === "anchor").length} anchors, ${journalistSet.size} journalists`,
    );
  } catch (error) {
    console.error("   ❌ Error loading historical transactions:", error);
    console.log("   ℹ️  Continuing with empty history...");
  }
}

// =====================================================
// Request Validation Schemas
// =====================================================

const AnchorRequestSchema = z.object({
  ipfsCid: z.string().min(1),
  contentHash: z.string().regex(/^[0-9a-fA-F]{128}$/), // BLAKE2b-512 is 64 bytes = 128 hex chars
  gpsCoordinates: z.string().min(1),
  agencyId: z.string().min(1),
  journalistAddress: z.string().regex(/^0x[0-9a-fA-F]{64}$/), // Sui address
  // Optional: include press pass ID for validation
  pressPassId: z.string().optional(),
});

type AnchorRequest = z.infer<typeof AnchorRequestSchema>;

// =====================================================
// Phase 2: "Shutter Click" - Sponsored Transaction Endpoint
// =====================================================

/**
 * POST /api/anchor-media
 *
 * Phase 2 of the Source-to-Screen flow.
 * This endpoint receives a request from a journalist's mobile app and
 * sponsors the transaction to anchor their media on-chain.
 */
app.post("/api/anchor-media", async (req: Request, res: Response) => {
  try {
    // Step 1: Validate request payload
    const validationResult = AnchorRequestSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
      return;
    }

    const data: AnchorRequest = validationResult.data;

    console.log(
      `\n📸 New anchor request from journalist: ${data.journalistAddress}`,
    );
    console.log(`   IPFS CID: ${data.ipfsCid}`);
    console.log(`   Location: ${data.gpsCoordinates}`);

    // Step 2: Optional - Validate journalist's press pass
    // TODO: Query blockchain to verify they have a valid PressPass NFT
    // For now, we trust the request

    // Step 3: Create Programmable Transaction Block
    const tx = new Transaction();

    // Convert parameters to format expected by Move (vector<u8>)
    const cidBytes = Array.from(new TextEncoder().encode(data.ipfsCid));
    const hashBytes = Array.from(
      new Uint8Array(Buffer.from(data.contentHash, "hex")),
    );
    const gpsBytes = Array.from(new TextEncoder().encode(data.gpsCoordinates));
    const agencyBytes = Array.from(new TextEncoder().encode(data.agencyId));

    // Call the Move function with proper BCS encoding
    tx.moveCall({
      target: `${process.env.PACKAGE_ID}::suiproof::anchor_original_media`,
      arguments: [
        tx.pure(bcs.vector(bcs.U8).serialize(cidBytes).toBytes()),
        tx.pure(bcs.vector(bcs.U8).serialize(hashBytes).toBytes()),
        tx.pure(bcs.vector(bcs.U8).serialize(gpsBytes).toBytes()),
        tx.pure(bcs.vector(bcs.U8).serialize(agencyBytes).toBytes()),
      ],
    });

    // NOTE: The sponsor IS the transaction sender (pays gas + signs).
    // The journalist's address is recorded in the API payload for off-chain
    // audit trails. A full PTB sponsorship (2-sig) requires the journalist
    // to pre-sign on their device — use the mobile app flow for that.
    // For the web dashboard, the institution anchors on behalf of the journalist.

    // Step 4: Sponsor the transaction (institution pays gas)
    // Note: In production, you may want to set gas budget limits
    tx.setSender(sponsorAddress); // Set the sponsor as the transaction sender
    tx.setGasBudget(100000000); // 0.1 SUI

    console.log(
      `   ⛽ Sponsoring transaction with gas from: ${sponsorAddress}`,
    );

    // Step 5: Sign with sponsor's key
    const txBytes = await tx.build({ client: suiClient });
    const signature = await sponsorKeypair.signTransaction(txBytes);

    // Step 6: Execute the transaction
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: signature.signature,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log(`   ✅ Transaction executed: ${result.digest}`);
    console.log(`   📋 Manifest created`);

    // Extract manifest ID from object changes
    const createdObjects = result.objectChanges?.filter(
      (change): change is Extract<typeof change, { type: "created" }> =>
        change.type === "created",
    );
    const manifestObject = createdObjects?.find((obj) =>
      obj.objectType.includes("MediaManifest"),
    );

    // Record transaction in history
    recordTransaction({
      id: result.digest,
      timestamp: Date.now(),
      type: "anchor",
      journalist: data.journalistAddress,
      gasCost: calculateGasCost(result.effects),
      txDigest: result.digest,
      status: "success",
      details: {
        ipfsCid: data.ipfsCid,
        gps: data.gpsCoordinates,
        agencyId: data.agencyId,
      },
    });

    // Step 7: Return success response to journalist's app
    res.json({
      success: true,
      transactionDigest: result.digest,
      manifestId: manifestObject?.objectId || null,
      explorerUrl: `https://suiscan.xyz/${process.env.SUI_NETWORK}/tx/${result.digest}`,
      sponsoredBy: sponsorAddress,
    });
  } catch (error) {
    console.error("❌ Error processing anchor request:", error);

    res.status(500).json({
      success: false,
      error: "Failed to anchor media",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// =====================================================
// Phase 1: Agency Setup Endpoints
// =====================================================

/**
 * POST /api/register-agency
 *
 * Register a news agency on-chain
 */
app.post("/api/register-agency", async (req: Request, res: Response) => {
  try {
    const { name, agencyId } = req.body;

    if (!name || !agencyId) {
      res
        .status(400)
        .json({ success: false, error: "Name and agencyId required" });
      return;
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${process.env.PACKAGE_ID}::suiproof::register_agency`,
      arguments: [
        tx.pure(new TextEncoder().encode(name)),
        tx.pure(new TextEncoder().encode(agencyId)),
      ],
    });

    // Execute as sponsor
    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: sponsorKeypair,
    });

    // Record transaction
    recordTransaction({
      id: result.digest,
      timestamp: Date.now(),
      type: "agency",
      journalist: sponsorAddress, // Agency admin
      gasCost: 0.001, // Estimate
      txDigest: result.digest,
      status: "success",
      details: {
        agencyId,
      },
    });

    res.json({
      success: true,
      transactionDigest: result.digest,
      message: `Agency "${name}" registered successfully`,
    });
  } catch (error) {
    console.error("Error registering agency:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /api/issue-press-pass
 *
 * Issue a press pass to a journalist
 */
app.post("/api/issue-press-pass", async (req: Request, res: Response) => {
  try {
    const { agencyObjectId, journalistAddress, journalistName, expiresAt } =
      req.body;

    if (!agencyObjectId || !journalistAddress || !journalistName) {
      res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
      return;
    }

    const tx = new Transaction();

    tx.moveCall({
      target: `${process.env.PACKAGE_ID}::suiproof::issue_press_pass`,
      arguments: [
        tx.object(agencyObjectId),
        tx.pure.address(journalistAddress),
        tx.pure(new TextEncoder().encode(journalistName)),
        tx.pure.u64(expiresAt || 0),
      ],
    });

    const result = await suiClient.signAndExecuteTransaction({
      transaction: tx,
      signer: sponsorKeypair,
    });

    // Record transaction
    recordTransaction({
      id: result.digest,
      timestamp: Date.now(),
      type: "press-pass",
      journalist: journalistAddress,
      gasCost: 0.001, // Estimate
      txDigest: result.digest,
      status: "success",
      details: {
        journalistName,
      },
    });

    res.json({
      success: true,
      transactionDigest: result.digest,
      message: `Press pass issued to ${journalistName}`,
    });
  } catch (error) {
    console.error("Error issuing press pass:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// =====================================================
// Health & Info Endpoints
// =====================================================

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "SuiProof Institutional Node",
    network: process.env.SUI_NETWORK,
    sponsorAddress,
  });
});

app.get("/info", (req: Request, res: Response) => {
  res.json({
    service: "SuiProof Institutional Node",
    version: "1.0.0",
    description:
      "Backend service for sponsoring journalist content anchoring on Sui blockchain",
    phase: "Phase 2 - Shutter Click",
    sponsor: sponsorAddress,
    network: process.env.SUI_NETWORK,
    packageId: process.env.PACKAGE_ID,
    agencyId: process.env.AGENCY_ID,
    agencyName: process.env.AGENCY_NAME,
  });
});

// =====================================================
// Statistics & Transaction History Endpoints
// =====================================================

/**
 * GET /api/stats
 *
 * Returns aggregated statistics about sponsored transactions
 */
app.get("/api/stats", (req: Request, res: Response) => {
  const totalTransactions = transactionHistory.length;
  const mediaAnchored = transactionHistory.filter(
    (tx) => tx.type === "anchor",
  ).length;
  const totalGasSpent = transactionHistory.reduce(
    (sum, tx) => sum + tx.gasCost,
    0,
  );
  const avgCostPerTx =
    totalTransactions > 0 ? totalGasSpent / totalTransactions : 0;

  res.json({
    totalTransactions,
    gasSpent: totalGasSpent,
    activeJournalists: journalistSet.size,
    mediaAnchored,
    avgCostPerTx,
  });
});

/**
 * GET /api/transactions
 *
 * Returns recent transaction history
 * Query params:
 *   - limit: number of transactions to return (default: 20, max: 100)
 */
app.get("/api/transactions", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const transactions = transactionHistory.slice(0, limit);

  res.json(transactions);
});

// =====================================================
// Start Server
// =====================================================

async function startServer() {
  // Load historical transactions from blockchain
  await loadHistoricalTransactions();

  app.listen(PORT, () => {
    console.log(`\n🚀 Institutional Node running on port ${PORT}`);
    console.log(`📖 Documentation: http://localhost:${PORT}/info`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`\n🏛️  Ready to sponsor journalist transactions\n`);
  });
}

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
