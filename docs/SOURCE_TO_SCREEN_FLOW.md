# SuiProof "Source-to-Screen" User Flow - Implementation Guide

## Overview

This document explains how SuiProof implements the complete **"Source-to-Screen"** workflow for institutional journalism on the blockchain. The system enables zero-friction content verification from field capture to public consumption.

## The Four Phases

### Phase 1: Institutional Onboarding (The Setup)

**What Happens**: Before journalists go into the field, the news agency establishes its on-chain identity and credentials its staff.

**Technical Implementation**:

1. **Register News Agency** (One-time setup)
   ```bash
   # Via Institutional Node
   POST /api/register-agency
   {
     "name": "Associated Press",
     "agencyId": "SUI_AP_091"
   }
   ```
   
   **Move Contract Function**: `register_agency()`
   - Creates an `AgencyObject` on Sui
   - Owned by agency admin
   - Contains agency name, ID, and admin address

2. **Issue Press Pass** (Per journalist)
   ```bash
   POST /api/issue-press-pass
   {
     "agencyObjectId": "0x...",
     "journalistAddress": "0x...",
     "journalistName": "Jane Doe",
     "expiresAt": 1735689600000
   }
   ```
   
   **Move Contract Function**: `issue_press_pass()`
   - Creates a `PressPass` NFT
   - Linked to the agency via `agency_id`
   - Transferred to journalist's wallet
   - Can include expiration date

**Key Files**:
- Smart Contract: [`sui/sources/suiproof.move`](../sui/sources/suiproof.move) - Lines 16-48 (Structs), Lines 160-220 (Functions)
- Backend API: [`institutional-node/src/index.ts`](../institutional-node/src/index.ts) - Lines 208-280

---

### Phase 2: The "Shutter Click" (Capture & Anchor)

**What Happens**: Field journalist captures content. The app performs zero-friction blockchain anchoring with institutional sponsorship.

**User Experience** (Journalist's perspective):
1. Open SuiProof mobile app
2. Take photo/video
3. App auto-captures GPS, timestamp
4. Click "Anchor" button
5. Receive confirmation notification - **No gas fees, no seed phrases**

**Technical Flow**:

| Step | Action | Component | Details |
|------|--------|-----------|---------|
| 1 | Capture | Mobile Device | Camera hardware |
| 2 | Identity Check | zkLogin/Slush | Silent background auth |
| 3 | Hash Generation | TEE (Trusted Execution Environment) | BLAKE2b-512 hash of raw bytes |
| 4 | Metadata Bundle | Mobile OS | GPS, UTC time, device ID |
| 5 | Upload to IPFS | Pinata | Returns CID |
| 6 | Transaction Request | Journalist → Institutional Node | POST to `/api/anchor-media` |
| 7 | **Sponsorship** | Institutional Node | Creates PTB, **pays gas** |
| 8 | Execution | Sui Network | `anchor_original_media()` function |
| 9 | Confirmation | Institutional Node → Journalist | Returns `manifestId` |

**Code Example** (Mobile App simulation):

```typescript
// In the SuiProof frontend (simulating mobile workflow)
import { requestSponsoredAnchor } from '@/lib/institutional-node';

async function handleShutterClick(file: File, gps: string) {
  // Step 1: Hash file locally
  const hash = blake2b(64).update(fileBytes).digest('hex');
  
  // Step 2: Upload to IPFS
  const { cid } = await uploadToPinata(file);
  
  // Step 3: Request institutional sponsorship
  const result = await requestSponsoredAnchor({
    ipfsCid: cid,
    contentHash: hash,
    gpsCoordinates: gps,
    agencyId: 'SUI_AP_091',
    journalistAddress: walletAddress, // From zkLogin
  });
  
  // Step 4: Show confirmation
  if (result.success) {
    showNotification(`Secured! Manifest: ${result.manifestId}`);
  }
}
```

**Institutional Node (Gas Sponsor)**:

```typescript
// institutional-node/src/index.ts (simplified)
app.post('/api/anchor-media', async (req, res) => {
  const { ipfsCid, contentHash, gpsCoordinates, agencyId, journalistAddress } = req.body;
  
  // Create transaction
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::suiproof::anchor_original_media`,
    arguments: [
      tx.pure(new TextEncoder().encode(ipfsCid)),
      tx.pure(new Uint8Array(Buffer.from(contentHash, 'hex'))),
      tx.pure(new TextEncoder().encode(gpsCoordinates)),
      tx.pure(new TextEncoder().encode(agencyId)),
    ],
  });
  
  // CRITICAL: Set journalist as sender, but sponsor pays gas
  tx.setSender(journalistAddress);
  tx.setGasBudget(100000000); // 0.1 SUI
  
  // Sign with institutional sponsor key
  const signature = await sponsorKeypair.signTransaction(await tx.build());
  
  // Execute on-chain
  const result = await suiClient.executeTransactionBlock({
    transactionBlock: tx,
    signature,
  });
  
  res.json({
    success: true,
    transactionDigest: result.digest,
    manifestId: extractManifestId(result),
  });
});
```

**Key Files**:
- Frontend: [`src/app/page.tsx`](../src/app/page.tsx) - Lines 169-340 (handleCreateAnchor function)
- Institutional Node Client: [`src/lib/institutional-node.ts`](../src/lib/institutional-node.ts)
- Institutional Node Server: [`institutional-node/src/index.ts`](../institutional-node/src/index.ts) - Lines 60-155
- Smart Contract: [`sui/sources/suiproof.move`](../sui/sources/suiproof.move) - Lines 222-278 (anchor_original_media)

---

### Phase 3: Editorial Review (Authorized Edits)

**What Happens**: Editor receives the original file, makes necessary edits (crop, color correction), and creates a linked version on-chain.

**User Experience** (Editor's perspective):
1. Import original file into editing software (e.g., Photoshop plugin)
2. Plugin verifies file against blockchain
3. Make edits (crop, color grade, etc.)
4. Save → Plugin creates new manifest linked to original
5. Edited version now has provenance chain

**Technical Flow**:

```typescript
// Photoshop/Editor Plugin (future implementation)
async function saveEditedVersion(
  originalManifest: MediaManifest,
  editedFile: File,
  editDescription: string
) {
  // Hash the edited version
  const newHash = blake2b(64).update(editedFileBytes).digest('hex');
  
  // Upload edited version to IPFS
  const { cid: newCid } = await uploadToPinata(editedFile);
  
  // Create linked version on-chain
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::suiproof::create_edited_version`,
    arguments: [
      tx.object(originalManifest.id), // Reference to original
      tx.pure(new TextEncoder().encode(newCid)),
      tx.pure(new Uint8Array(Buffer.from(newHash, 'hex'))),
      tx.pure(new TextEncoder().encode(editDescription)), // "Cropped 20%"
    ],
  });
  
  await wallet.signAndExecuteTransaction(tx);
}
```

**On-Chain Structure**:

```move
// Original MediaManifest
MediaManifest {
  id: 0xAAA,
  ipfs_cid: "QmOriginal...",
  content_hash: [...],
  parent_id: 0x0,  // No parent (this IS the original)
  edit_type: "",   // Empty for originals
  is_original: true,
}

// Edited MediaManifest (linked to original)
MediaManifest {
  id: 0xBBB,
  ipfs_cid: "QmEdited...",
  content_hash: [...],
  parent_id: 0xAAA,  // Points to original manifest
  edit_type: "Cropped 20%",
  is_original: false,
}
```

**Key Files**:
- Smart Contract: [`sui/sources/suiproof.move`](../sui/sources/suiproof.move) - Lines 280-331 (create_edited_version)
- Frontend Component: [`src/components/new-anchor-modal.tsx`](../src/components/new-anchor-modal.tsx) - Modal UI

---

### Phase 4: Public Verification (The Trust Loop)

**What Happens**: Public sees content on social media/news sites and can verify its authenticity instantly.

**User Experience** (Public viewer):
1. See a photo on Twitter with "Verified" badge
2. Click badge OR drag image to SuiProof.com
3. Browser hashes the image locally
4. Results appear:
   - **Green Seal**: "Verified Original from Reuters. Captured in Manila, Feb 17, 2026."
   - **Yellow Seal**: "Verified Edit. Traceable to original captured by BBC."
   - **Red Warning**: "UNVERIFIED. Metadata missing or altered."

**Technical Flow**:

```typescript
// src/components/verifier-view.tsx
async function verifyImage(file: File) {
  // Step 1: Hash file locally (browser-side)
  const hash = blake2b(64).update(fileBytes).digest('hex');
  
  // Step 2: Query blockchain
  const result = await verifyFileOnBlockchain(hash);
  
  if (result.verified && result.manifestData) {
    // GREEN SEAL: Original verified content
    if (result.manifestData.isOriginal) {
      return {
        seal: 'green',
        title: 'Authentic Media Confirmed',
        message: `Original capture by ${result.manifestData.agencyId}`,
        location: result.manifestData.gpsCoordinates,
        timestamp: result.manifestData.createdAt,
      };
    }
    // YELLOW SEAL: Verified edit with lineage
    else {
      return {
        seal: 'yellow',
        title: 'Verified Edit',
        message: 'Traceable to original',
        editType: result.manifestData.editType,
        parentId: result.manifestData.parentId,
      };
    }
  } else {
    // RED WARNING: No blockchain record found
    return {
      seal: 'red',
      title: 'Unverified Content',
      message: 'No blockchain record found. Possible tampering or AI-generated.',
    };
  }
}
```

**Blockchain Query** (Server Action):

```typescript
// src/app/actions.ts
export async function verifyFileOnBlockchain(contentHash: string) {
  const suiClient = new SuiClient({ url: RPC_URL });
  
  // Query events for this content hash
  const events = await suiClient.queryEvents({
    query: {
      MoveEventType: `${PACKAGE_ID}::suiproof::MediaAnchored`,
    },
  });
  
  // Find matching manifest
  const match = events.data.find(event => 
    event.parsedJson.content_hash_hex === contentHash
  );
  
  if (match) {
    return {
      verified: true,
      manifestData: {
        manifestId: match.parsedJson.manifest_id,
        ipfsCid: match.parsedJson.ipfs_cid,
        gpsCoordinates: match.parsedJson.gps_coordinates,
        agencyId: match.parsedJson.agency_id,
        creator: match.parsedJson.creator,
        createdAt: new Date(match.parsedJson.created_at).toLocaleString(),
        isOriginal: match.parsedJson.is_original,
        parentId: match.parsedJson.parent_id,
      },
    };
  }
  
  return { verified: false };
}
```

**Key Files**:
- Verifier UI: [`src/components/verifier-view.tsx`](../src/components/verifier-view.tsx)
- Blockchain Query: [`src/app/actions.ts`](../src/app/actions.ts) - Lines 21-60
- Smart Contract Events: [`sui/sources/suiproof.move`](../sui/sources/suiproof.move) - Lines 104-132

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: ONBOARDING                         │
│  ┌──────────────┐         ┌─────────────────┐        ┌──────────┐  │
│  │ News Agency  │ ──────> │ Deploy Agency   │ ─────> │ Sui      │  │
│  │ Admin        │         │ Object          │        │ Network  │  │
│  └──────────────┘         └─────────────────┘        └──────────┘  │
│         │                                                    │       │
│         │                                                    ▼       │
│         │                 ┌─────────────────┐        ┌──────────┐  │
│         └───────────────> │ Issue Press     │ ─────> │ PressPass│  │
│                           │ Pass NFT        │        │ → Wallet │  │
│                           └─────────────────┘        └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 2: SHUTTER CLICK                         │
│  ┌──────────────┐    ┌─────────────┐    ┌──────────────────────┐  │
│  │ Journalist   │───>│ Mobile App  │───>│ Hash + GPS + Time    │  │
│  │ (Field)      │    │ (Camera)    │    │ Metadata Bundle      │  │
│  └──────────────┘    └─────────────┘    └──────────────────────┘  │
│                             │                       │               │
│                             │                       ▼               │
│                             │            ┌─────────────────────┐   │
│                             │            │ Upload to Pinata    │   │
│                             │            │ Get IPFS CID        │   │
│                             │            └─────────────────────┘   │
│                             │                       │               │
│                             ▼                       ▼               │
│                      ┌──────────────────────────────────────┐      │
│                      │   Institutional Node (Backend)       │      │
│                      │   • Receives request                 │      │
│                      │   • Creates PTB                      │      │
│                      │   • SPONSORS GAS (Institution pays)  │      │
│                      │   • Executes on Sui                  │      │
│                      └──────────────────────────────────────┘      │
│                                      │                              │
│                                      ▼                              │
│                      ┌──────────────────────────────┐              │
│                      │  Sui Network                 │              │
│                      │  • Mints MediaManifest NFT   │              │
│                      │  • Emits MediaAnchored Event │              │
│                      │  • Transfers to Journalist   │              │
│                      └──────────────────────────────┘              │
│                                      │                              │
│                                      ▼                              │
│                      ┌──────────────────────────────┐              │
│                      │  Confirmation to Journalist  │              │
│                      │  "Secured! Manifest ID: 0x.."│              │
│                      └──────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: EDITORIAL REVIEW                        │
│  ┌──────────────┐    ┌─────────────┐    ┌──────────────────────┐  │
│  │ Editor       │───>│ Import      │───>│ Verify Original      │  │
│  │ (Newsroom)   │    │ Original    │    │ Against Blockchain   │  │
│  └──────────────┘    └─────────────┘    └──────────────────────┘  │
│         │                                           │               │
│         ▼                                           ▼               │
│  ┌─────────────┐                        ┌─────────────────────┐   │
│  │ Make Edits  │                        │ ✓ Verified          │   │
│  │ (Crop, etc) │                        │                     │   │
│  └─────────────┘                        └─────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────┐             │
│  │ Create Linked Version (create_edited_version)    │             │
│  │ • New hash + new IPFS CID                        │             │
│  │ • parent_id = original manifest ID               │             │
│  │ • edit_type = "Cropped 20%"                      │             │
│  │ • Preserves provenance chain                     │             │
│  └──────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   PHASE 4: PUBLIC VERIFICATION                      │
│  ┌──────────────┐    ┌─────────────┐    ┌──────────────────────┐  │
│  │ Public User  │───>│ Sees Content│───>│ Clicks "Verify"      │  │
│  │              │    │ on Twitter  │    │ Badge                │  │
│  └──────────────┘    └─────────────┘    └──────────────────────┘  │
│                                                     │               │
│                                                     ▼               │
│                                          ┌─────────────────────┐   │
│                                          │ Browser Hashes File │   │
│                                          │ (Client-Side)       │   │
│                                          └─────────────────────┘   │
│                                                     │               │
│                                                     ▼               │
│                                          ┌─────────────────────┐   │
│                                          │ Query Sui Network   │   │
│                                          │ for Manifest        │   │
│                                          └─────────────────────┘   │
│                                                     │               │
│                              ┌──────────────────────┼───────────┐  │
│                              ▼                      ▼           ▼  │
│                    ┌─────────────┐      ┌──────────────┐  ┌────────┐│
│                    │ GREEN SEAL  │      │ YELLOW SEAL  │  │ RED   ││
│                    │ Verified    │      │ Verified Edit│  │WARNING││
│                    │ Original    │      │ (w/ lineage) │  │Unverif││
│                    └─────────────┘      └──────────────┘  └────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Technologies

### Smart Contract (Move on Sui)
- **Location**: `sui/sources/suiproof.move`
- **Key Structs**: `AgencyObject`, `PressPass`, `MediaManifest`, `Anchor`
- **Key Functions**: 
  - `register_agency()` - Phase 1
  - `issue_press_pass()` - Phase 1
  - `anchor_original_media()` - Phase 2
  - `create_edited_version()` - Phase 3

### Institutional Node (Backend Service)
- **Location**: `institutional-node/`
- **Stack**: Node.js + Express + TypeScript + Sui SDK
- **Purpose**: Gas sponsorship for journalists
- **Endpoints**:
  - `POST /api/anchor-media` - Main Phase 2 endpoint
  - `POST /api/register-agency` - Phase 1
  - `POST /api/issue-press-pass` - Phase 1

### Frontend (Next.js)
- **Location**: `src/`
- **Key Components**:
  - `verifier-view.tsx` - Phase 4 (Public verification)
  - `dashboard-view.tsx` - Journalist dashboard
  - `new-anchor-modal.tsx` - Content anchoring UI
- **Key Libraries**:
  - `@mysten/sui` - Blockchain interaction
  - `blake2b` - Cryptographic hashing
  - `@suiet/wallet-kit` - Wallet integration

### Storage Layer
- **IPFS (Pinata)**: Decentralized file storage
- **Sui Blockchain**: Immutable metadata ledger

---

## Security Considerations

### 1. Press Pass Validation
Currently, the institutional node trusts all requests. In production:

```typescript
// Enhanced validation
async function validateJournalist(journalistAddress: string, agencyId: string) {
  // Query blockchain for PressPass NFT
  const pressPass = await suiClient.getOwnedObjects({
    owner: journalistAddress,
    filter: {
      StructType: `${PACKAGE_ID}::suiproof::PressPass`,
    },
  });
  
  // Verify press pass belongs to correct agency
  const passData = await suiClient.getObject({ id: pressPass[0].data.objectId });
  if (passData.agency_id !== agencyId) {
    throw new Error('Unauthorized: PressPass agency mismatch');
  }
  
  // Check expiration
  if (passData.expires_at > 0 && Date.now() > passData.expires_at) {
    throw new Error('Press pass expired');
  }
  
  return true;
}
```

### 2. Rate Limiting
Protect the institutional node from abuse:

```typescript
import rateLimit from 'express-rate-limit';

const anchorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 anchors per journalist per 15min
  keyGenerator: (req) => req.body.journalistAddress,
});

app.post('/api/anchor-media', anchorLimiter, handler);
```

### 3. Gas Budget Monitoring
Prevent runaway costs:

```typescript
// Set per-transaction limits
tx.setGasBudget(100000000); // 0.1 SUI max

// Monitor sponsor account balance
setInterval(async () => {
  const balance = await suiClient.getBalance({ owner: sponsorAddress });
  if (BigInt(balance.totalBalance) < MIN_BALANCE_THRESHOLD) {
    sendAlertToAdmin('Low SUI balance in sponsor account!');
  }
}, 60000); // Check every minute
```

---

## Deployment Guide

### 1. Deploy Smart Contract

```bash
cd sui
sui client publish --gas-budget 100000000
```

Copy the `PACKAGE_ID` from the output.

### 2. Set Up Institutional Node

```bash
cd institutional-node
npm install
cp .env.example .env
```

Edit `.env`:
```env
SPONSOR_PRIVATE_KEY=<your_sponsor_private_key>
PACKAGE_ID=<from_step_1>
SUI_NETWORK=testnet
```

Start the node:
```bash
npm run dev
```

### 3. Configure Frontend

Edit `.env.local`:
```env
NEXT_PUBLIC_PACKAGE_ID=<from_step_1>
NEXT_PUBLIC_INSTITUTIONAL_NODE_URL=http://localhost:3001
NEXT_PUBLIC_PINATA_JWT=<your_pinata_jwt>
```

Start frontend:
```bash
npm run dev
```

---

## Testing the Complete Flow

### Phase 1: Onboarding

```bash
# Register agency
curl -X POST http://localhost:3001/api/register-agency \
  -H "Content-Type: application/json" \
  -d '{"name":"Associated Press","agencyId":"SUI_AP_091"}'

# Issue press pass
curl -X POST http://localhost:3001/api/issue-press-pass \
  -H "Content-Type: application/json" \
  -d '{
    "agencyObjectId":"0x...",
    "journalistAddress":"0x...",
    "journalistName":"Jane Doe",
    "expiresAt":0
  }'
```

### Phase 2: Shutter Click

1. Open http://localhost:3000
2. Click "+ New Anchor"
3. Toggle "Institutional Sponsorship" ON
4. Upload test image
5. Fill GPS: "14.5995° N, 120.9842° E"
6. Fill Agency ID: "SUI_AP_091"
7. Click "Create Anchor"
8. Check institutional node logs for sponsorship

### Phase 3: Editorial Review

(Coming soon - plugin integration)

### Phase 4: Public Verification

1. Navigate to "Verify" tab
2. Drag the same image you anchored
3. See GREEN SEAL with agency information

---

## Future Enhancements

1. **Mobile App**: Native iOS/Android apps for journalists
2. **zkLogin Integration**: Passwordless authentication via Google/Apple
3. **Editor Plugins**: Adobe Photoshop/Lightroom plugins
4. **AI Detection**: Integrate synthetic media detection
5. **Multi-Agency Federation**: Cross-agency content verification
6. **Press Pass Marketplace**: Revocable credentials with on-chain reputation

---

## Support

For questions or issues:
- **Documentation**: See README files in each directory
- **Smart Contract**: [sui/sources/suiproof.move](../sui/sources/suiproof.move)
- **Institutional Node**: [institutional-node/README.md](../institutional-node/README.md)
