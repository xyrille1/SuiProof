# SuiProof Institutional Node

## Overview

The **Institutional Node** is a backend service that sponsors blockchain transactions for journalists. It implements **Phase 2 ("Shutter Click")** of the SuiProof Source-to-Screen user flow.

## Purpose

In the SuiProof ecosystem, journalists capture media in the field using mobile apps. However, requiring them to:
- Hold cryptocurrency for gas fees
- Manage private keys
- Understand blockchain mechanics

...would create **friction** that undermines the "Zero-Friction" goal.

**Solution**: The Institutional Node acts as a **gas sponsor**. When a journalist captures content:
1. Their app sends metadata to this node
2. The node creates and signs the blockchain transaction
3. **The institution pays the gas**, not the journalist
4. The MediaManifest NFT is still owned by the journalist

## Architecture

```
┌─────────────────┐         ┌──────────────────────┐         ┌────────────────┐
│  Journalist's   │         │  Institutional Node  │         │  Sui Network   │
│   Mobile App    │ ──────> │  (Gas Sponsor)       │ ──────> │  (Blockchain)  │
└─────────────────┘         └──────────────────────┘         └────────────────┘
     Sends:                        Processes:                      Executes:
     • Hash                        • Validates                     • Mints NFT
     • GPS                         • Creates PTB                   • Emits Event
     • Metadata                    • Pays Gas                      • Returns ID
```

## Installation

```bash
cd institutional-node
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
# Sui Network
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Sponsor Account (Institution's wallet that pays gas)
SPONSOR_PRIVATE_KEY=<your_private_key>

# Smart Contract
PACKAGE_ID=<your_deployed_package_id>

# Agency Info
AGENCY_ID=SUI_AP_091
AGENCY_NAME=Associated Press

# Server
PORT=3001
```

### Getting a Sponsor Private Key

The sponsor account is the institution's wallet that will pay gas fees for all journalist transactions.

**For Testnet:**
```bash
# Get testnet SUI tokens
sui client faucet

# Export your private key
sui keytool export --key-identity <your-address>
```

**For Production:**
- Use a dedicated hardware wallet or KMS
- Fund with sufficient SUI for ongoing operations
- Implement monitoring for balance alerts

## API Endpoints

### POST `/api/anchor-media`
**Phase 2: Shutter Click - Main endpoint for journalists**

Sponsors a media anchoring transaction.

**Request:**
```json
{
  "ipfsCid": "QmX...",
  "contentHash": "abc123...",  // BLAKE2b hash (64 hex chars)
  "gpsCoordinates": "14.5995° N, 120.9842° E",
  "agencyId": "SUI_AP_091",
  "journalistAddress": "0x123...",
  "pressPassId": "0xabc..."  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "transactionDigest": "0x...",
  "manifestId": "0x...",
  "explorerUrl": "https://suiscan.xyz/testnet/tx/...",
  "sponsoredBy": "0x..."
}
```

### POST `/api/register-agency`
**Phase 1: Register a news organization**

```json
{
  "name": "Associated Press",
  "agencyId": "SUI_AP_091"
}
```

### POST `/api/issue-press-pass`
**Phase 1: Issue credentials to a journalist**

```json
{
  "agencyObjectId": "0x...",
  "journalistAddress": "0x...",
  "journalistName": "Jane Doe",
  "expiresAt": 1735689600000  // Optional timestamp
}
```

### GET `/health`
Health check endpoint

### GET `/info`
Service information and configuration

## Running the Node

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Security Considerations

### 1. **API Authentication**
In production, implement authentication:
- API keys for journalists
- JWT tokens
- OAuth 2.0

### 2. **Rate Limiting**
Prevent abuse with rate limits:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each journalist to 100 requests per windowMs
});

app.use('/api/anchor-media', limiter);
```

### 3. **Press Pass Validation**
Enhance the `/api/anchor-media` endpoint to verify the journalist owns a valid `PressPass` NFT before sponsoring their transaction.

### 4. **Gas Budget Monitoring**
Monitor the sponsor account balance and implement alerts when running low on SUI.

## Workflow Integration

### Phase 1: Institutional Onboarding
```bash
# 1. Register your agency
curl -X POST http://localhost:3001/api/register-agency \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reuters",
    "agencyId": "SUI_REUTERS_001"
  }'

# 2. Issue press passes to journalists
curl -X POST http://localhost:3001/api/issue-press-pass \
  -H "Content-Type: application/json" \
  -d '{
    "agencyObjectId": "0x...",
    "journalistAddress": "0x...",
    "journalistName": "John Smith",
    "expiresAt": 0
  }'
```

### Phase 2: Field Photography (Journalist Flow)
From the mobile app:
```typescript
// After capturing photo and calculating hash
const response = await fetch('https://your-node.com/api/anchor-media', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ipfsCid: uploadedCid,
    contentHash: blake2bHash,
    gpsCoordinates: `${lat}° N, ${lng}° E`,
    agencyId: 'SUI_REUTERS_001',
    journalistAddress: walletAddress,
  }),
});

const result = await response.json();
// result.manifestId is the on-chain proof
```

## Monitoring & Logs

The node logs all operations:
```
📸 New anchor request from journalist: 0x123...
   IPFS CID: QmX...
   Location: 14.5995° N, 120.9842° E
   ⛽ Sponsoring transaction with gas from: 0xabc...
   ✅ Transaction executed: 0xdef...
   📋 Manifest created
```

## Scaling Considerations

For high-volume newsrooms:
1. **Load Balancing**: Deploy multiple institutional nodes behind a load balancer
2. **Database**: Store press pass mappings in PostgreSQL/MongoDB
3. **Queue System**: Use Redis/RabbitMQ for transaction batching
4. **Caching**: Cache press pass validations to reduce on-chain reads

## Troubleshooting

### "Insufficient gas"
- Fund the sponsor account with more SUI
- Adjust `tx.setGasBudget()` in the code

### "Invalid signature"
- Verify `SPONSOR_PRIVATE_KEY` is correct
- Ensure key format is hex without '0x' prefix

### "Package not found"
- Verify `PACKAGE_ID` matches your deployed contract
- Ensure you're connected to the correct network

## License

MIT

## Support

For issues or questions about the institutional node, contact:
- **Technical Support**: [your-email]
- **Documentation**: [docs-url]
