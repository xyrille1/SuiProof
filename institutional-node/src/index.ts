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

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { z } from 'zod';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { bcs } from '@mysten/sui/bcs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Sui Client
const suiClient = new SuiClient({ 
  url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
});

// Initialize sponsor keypair (institution's wallet that pays gas)
// Note: In production, use a more secure key management system
if (!process.env.SPONSOR_PRIVATE_KEY || process.env.SPONSOR_PRIVATE_KEY === 'YOUR_PRIVATE_KEY_HERE') {
  console.error('❌ ERROR: SPONSOR_PRIVATE_KEY not set in .env file');
  console.error('');
  console.error('Please run: sui keytool export --key-identity <your-address>');
  console.error('Then update institutional-node/.env with the exported key');
  process.exit(1);
}

let sponsorKeypair;
try {
  // Decode the Sui private key (format: suiprivkey1q...)
  const parsed = decodeSuiPrivateKey(process.env.SPONSOR_PRIVATE_KEY);
  sponsorKeypair = Ed25519Keypair.fromSecretKey(parsed.secretKey);
} catch (error) {
  console.error('❌ ERROR: Invalid SPONSOR_PRIVATE_KEY format');
  console.error('Expected format: suiprivkey1q... (from sui keytool export)');
  console.error('');
  console.error('Run: sui keytool export --key-identity <your-address>');
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const sponsorAddress = sponsorKeypair.getPublicKey().toSuiAddress();
console.log(`🏛️  Institutional Node initialized`);
console.log(`📍 Sponsor Address: ${sponsorAddress}`);
console.log(`🌐 Network: ${process.env.SUI_NETWORK}`);
console.log(`📦 Package ID: ${process.env.PACKAGE_ID}`);

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
app.post('/api/anchor-media', async (req: Request, res: Response) => {
  try {
    // Step 1: Validate request payload
    const validationResult = AnchorRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.errors,
      });
      return;
    }

    const data: AnchorRequest = validationResult.data;
    
    console.log(`\n📸 New anchor request from journalist: ${data.journalistAddress}`);
    console.log(`   IPFS CID: ${data.ipfsCid}`);
    console.log(`   Location: ${data.gpsCoordinates}`);

    // Step 2: Optional - Validate journalist's press pass
    // TODO: Query blockchain to verify they have a valid PressPass NFT
    // For now, we trust the request
    
    // Step 3: Create Programmable Transaction Block
    const tx = new Transaction();
    
    // Convert parameters to format expected by Move (vector<u8>)
    const cidBytes = Array.from(new TextEncoder().encode(data.ipfsCid));
    const hashBytes = Array.from(new Uint8Array(Buffer.from(data.contentHash, 'hex')));
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
    
    // CRITICAL: Set the sender to the journalist's address
    // The sponsor (us) pays the gas, but the journalist is the creator
    tx.setSender(data.journalistAddress);
    
    // Step 4: Sponsor the transaction (institution pays gas)
    // Note: In production, you may want to set gas budget limits
    tx.setGasBudget(100000000); // 0.1 SUI
    
    console.log(`   ⛽ Sponsoring transaction with gas from: ${sponsorAddress}`);
    
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
    const man: anyifestObject = result.objectChanges?.find(
      (change) => change.type === 'created' && 
                  change.objectType.includes('MediaManifest')
    );
    
    // Step 7: Return success response to journalist's app
    res.json({
      success: true,
      transactionDigest: result.digest,
      manifestId: manifestObject?.objectId || null,
      explorerUrl: `https://suiscan.xyz/${process.env.SUI_NETWORK}/tx/${result.digest}`,
      sponsoredBy: sponsorAddress,
    });
    
  } catch (error) {
    console.error('❌ Error processing anchor request:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to anchor media',
      message: error instanceof Error ? error.message : 'Unknown error',
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
app.post('/api/register-agency', async (req: Request, res: Response) => {
  try {
    const { name, agencyId } = req.body;
    
    if (!name || !agencyId) {
      res.status(400).json({ success: false, error: 'Name and agencyId required' });
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

    res.json({
      success: true,
      transactionDigest: result.digest,
      message: `Agency "${name}" registered successfully`,
    });
    
  } catch (error) {
    console.error('Error registering agency:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/issue-press-pass
 * 
 * Issue a press pass to a journalist
 */
app.post('/api/issue-press-pass', async (req: Request, res: Response) => {
  try {
    const { agencyObjectId, journalistAddress, journalistName, expiresAt } = req.body;
    
    if (!agencyObjectId || !journalistAddress || !journalistName) {
      res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
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

    res.json({
      success: true,
      transactionDigest: result.digest,
      message: `Press pass issued to ${journalistName}`,
    });
    
  } catch (error) {
    console.error('Error issuing press pass:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// =====================================================
// Health & Info Endpoints
// =====================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    service: 'SuiProof Institutional Node',
    network: process.env.SUI_NETWORK,
    sponsorAddress,
  });
});

app.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'SuiProof Institutional Node',
    version: '1.0.0',
    description: 'Backend service for sponsoring journalist content anchoring on Sui blockchain',
    phase: 'Phase 2 - Shutter Click',
    sponsor: sponsorAddress,
    network: process.env.SUI_NETWORK,
    packageId: process.env.PACKAGE_ID,
    agencyId: process.env.AGENCY_ID,
    agencyName: process.env.AGENCY_NAME,
  });
});

// =====================================================
// Start Server
// =====================================================

app.listen(PORT, () => {
  console.log(`\n🚀 Institutional Node running on port ${PORT}`);
  console.log(`📖 Documentation: http://localhost:${PORT}/info`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\n🏛️  Ready to sponsor journalist transactions\n`);
});
