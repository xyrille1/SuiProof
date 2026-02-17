# Institutional Node API Reference

## Base URL

**Development**: `http://localhost:3001`  
**Production**: `https://your-node-domain.com`

---

## Authentication

Currently, the API does not require authentication. For production deployments, implement one of:

- **API Keys**: Include in `Authorization: Bearer <key>` header
- **JWT Tokens**: OAuth 2.0 flow for journalists
- **Press Pass Validation**: On-chain verification of PressPass NFT ownership

---

## Endpoints

### Health Check

#### `GET /health`

Check if the institutional node is operational.

**Response**:
```json
{
  "status": "healthy",
  "service": "SuiProof Institutional Node",
  "network": "testnet",
  "sponsorAddress": "0x..."
}
```

**Status Codes**:
- `200 OK` - Service is healthy

---

### Service Information

#### `GET /info`

Get detailed information about the institutional node configuration.

**Response**:
```json
{
  "service": "SuiProof Institutional Node",
  "version": "1.0.0",
  "description": "Backend service for sponsoring journalist content anchoring on Sui blockchain",
  "phase": "Phase 2 - Shutter Click",
  "sponsor": "0x...",
  "network": "testnet",
  "packageId": "0x...",
  "agencyId": "SUI_AP_091",
  "agencyName": "Associated Press"
}
```

**Status Codes**:
- `200 OK` - Information retrieved successfully

---

### Register Agency (Phase 1)

#### `POST /api/register-agency`

Register a news organization on the Sui blockchain.

**Request Body**:
```json
{
  "name": "Associated Press",
  "agencyId": "SUI_AP_091"
}
```

**Parameters**:
- `name` (string, required): Full name of the news agency
- `agencyId` (string, required): Unique identifier (e.g., "SUI_AP_091")

**Response**:
```json
{
  "success": true,
  "transactionDigest": "0x...",
  "message": "Agency \"Associated Press\" registered successfully"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message here"
}
```

**Status Codes**:
- `200 OK` - Agency registered successfully
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Transaction failed

**Example**:
```bash
curl -X POST http://localhost:3001/api/register-agency \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Reuters",
    "agencyId": "SUI_REUTERS_001"
  }'
```

---

### Issue Press Pass (Phase 1)

#### `POST /api/issue-press-pass`

Issue a PressPass NFT credential to a journalist.

**Request Body**:
```json
{
  "agencyObjectId": "0x...",
  "journalistAddress": "0x...",
  "journalistName": "Jane Doe",
  "expiresAt": 1735689600000
}
```

**Parameters**:
- `agencyObjectId` (string, required): Object ID of the AgencyObject
- `journalistAddress` (string, required): Sui wallet address of the journalist (0x...)
- `journalistName` (string, required): Name/identifier of the journalist
- `expiresAt` (number, optional): Unix timestamp in milliseconds (0 = no expiration)

**Response**:
```json
{
  "success": true,
  "transactionDigest": "0x...",
  "message": "Press pass issued to Jane Doe"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Unauthorized: PressPass agency mismatch"
}
```

**Status Codes**:
- `200 OK` - Press pass issued successfully
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Caller is not the agency admin
- `500 Internal Server Error` - Transaction failed

**Example**:
```bash
curl -X POST http://localhost:3001/api/issue-press-pass \
  -H "Content-Type: application/json" \
  -d '{
    "agencyObjectId": "0xABC123...",
    "journalistAddress": "0xDEF456...",
    "journalistName": "John Smith",
    "expiresAt": 0
  }'
```

---

### Anchor Media (Phase 2)

#### `POST /api/anchor-media`

**Primary endpoint for the "Shutter Click" workflow.**  
Request the institutional node to sponsor a content anchoring transaction.

**Request Body**:
```json
{
  "ipfsCid": "QmX...",
  "contentHash": "abc123...",
  "gpsCoordinates": "14.5995° N, 120.9842° E",
  "agencyId": "SUI_AP_091",
  "journalistAddress": "0x...",
  "pressPassId": "0x..."
}
```

**Parameters**:
- `ipfsCid` (string, required): IPFS CID of the uploaded media file
- `contentHash` (string, required): BLAKE2b-512 hash of the file (64 hex characters)
- `gpsCoordinates` (string, required): GPS location (e.g., "14.5995° N, 120.9842° E")
- `agencyId` (string, required): Agency identifier (must match PressPass)
- `journalistAddress` (string, required): Sui address of the journalist (becomes manifest owner)
- `pressPassId` (string, optional): Object ID of journalist's PressPass (for validation)

**Response**:
```json
{
  "success": true,
  "transactionDigest": "0x...",
  "manifestId": "0x...",
  "explorerUrl": "https://suiscan.xyz/testnet/tx/0x...",
  "sponsoredBy": "0x..."
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid request data",
  "details": [
    {
      "code": "invalid_string",
      "path": ["contentHash"],
      "message": "Expected 64 hex characters for BLAKE2b hash"
    }
  ]
}
```

**Status Codes**:
- `200 OK` - Transaction sponsored and executed successfully
- `400 Bad Request` - Invalid request format
- `500 Internal Server Error` - Sponsorship or transaction failed

**Example**:
```bash
curl -X POST http://localhost:3001/api/anchor-media \
  -H "Content-Type: application/json" \
  -d '{
    "ipfsCid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "contentHash": "a1b2c3d4e5f6...",
    "gpsCoordinates": "40.7128° N, 74.0060° W",
    "agencyId": "SUI_AP_091",
    "journalistAddress": "0x123...",
    "pressPassId": "0xABC..."
  }'
```

**Request Validation Rules**:
- `contentHash` must be exactly 64 hexadecimal characters (BLAKE2b-512 output)
- `journalistAddress` must match Sui address format: `0x` followed by 64 hex chars
- `ipfsCid` must be a valid IPFS CID (typically starts with "Qm" for v0 or "bafy" for v1)
- `gpsCoordinates` should follow format: "latitude° N/S, longitude° E/W"

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": "Brief error description",
  "message": "Detailed error message (optional)"
}
```

### Common Error Codes

| HTTP Code | Error | Cause |
|-----------|-------|-------|
| `400` | Bad Request | Invalid parameters or missing required fields |
| `401` | Unauthorized | Invalid API key or insufficient permissions |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Blockchain transaction failed or server error |
| `503` | Service Unavailable | Sui node not reachable or sponsor account out of gas |

---

## Rate Limiting

**Production Recommendation**: Implement rate limits to prevent abuse.

### Suggested Limits

- **Anchor endpoint**: 100 requests per 15 minutes per journalist
- **Agency registration**: 5 requests per hour per IP
- **Press pass issuance**: 50 requests per hour per agency admin

### Implementation Example

```typescript
import rateLimit from 'express-rate-limit';

const anchorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  keyGenerator: (req) => req.body.journalistAddress, // Per journalist
  message: {
    success: false,
    error: 'Rate limit exceeded. Please try again later.',
  },
});

app.post('/api/anchor-media', anchorLimiter, anchorHandler);
```

---

## Gas Sponsorship Details

### How It Works

1. **Journalist sends request** with their wallet address and content metadata
2. **Node creates PTB** (Programmable Transaction Block)
3. **Node sets journalist as sender**: `tx.setSender(journalistAddress)`
4. **Node signs transaction**: Uses institutional sponsor keypair
5. **Blockchain executes**: Gas is deducted from sponsor's account
6. **MediaManifest transferred**: Journalist becomes owner (no gas paid)

### Gas Budget

Default: **100,000,000 MIST** (0.1 SUI) per transaction

Adjust in `src/index.ts`:
```typescript
tx.setGasBudget(100000000); // 0.1 SUI
```

### Monitoring Sponsor Balance

```typescript
setInterval(async () => {
  const balance = await suiClient.getBalance({ 
    owner: sponsorAddress 
  });
  
  const suiBalance = Number(balance.totalBalance) / 1_000_000_000;
  
  if (suiBalance < 10) { // Alert if below 10 SUI
    sendAlert(`Low sponsor balance: ${suiBalance} SUI`);
  }
}, 60000); // Check every minute
```

---

## Security Best Practices

### 1. Environment Variables

**Never commit** `.env` files to version control!

```bash
# .gitignore
.env
.env.local
.env.production
```

### 2. API Authentication

For production, add authentication:

```typescript
import jwt from 'jsonwebtoken';

function authenticateJournalist(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.journalistAddress = decoded.address;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
}

app.post('/api/anchor-media', authenticateJournalist, anchorHandler);
```

### 3. Press Pass Validation

Enhance security by verifying PressPass ownership:

```typescript
async function validatePressPass(
  journalistAddress: string, 
  agencyId: string
) {
  // Query for PressPass NFTs owned by journalist
  const ownedObjects = await suiClient.getOwnedObjects({
    owner: journalistAddress,
    filter: {
      StructType: `${PACKAGE_ID}::suiproof::PressPass`,
    },
  });
  
  // Check if any PressPass matches the agency
  for (const obj of ownedObjects.data) {
    const details = await suiClient.getObject({ 
      id: obj.data.objectId,
      options: { showContent: true },
    });
    
    const passData = details.data.content.fields;
    
    if (passData.agency_id === agencyId && 
        passData.is_active && 
        (passData.expires_at === 0 || Date.now() < passData.expires_at)) {
      return true;
    }
  }
  
  return false;
}
```

### 4. HTTPS in Production

Always use HTTPS for production deployments:

```typescript
import https from 'https';
import fs from 'fs';

const options = {
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('cert.pem'),
};

https.createServer(options, app).listen(443);
```

---

## Webhooks (Future Feature)

**Planned**: Notify journalists when their transactions complete.

```json
POST <journalist_webhook_url>
{
  "event": "anchor_completed",
  "data": {
    "manifestId": "0x...",
    "transactionDigest": "0x...",
    "status": "success"
  }
}
```

---

## SDKs and Client Libraries

### TypeScript/JavaScript

```typescript
import { requestSponsoredAnchor } from '@/lib/institutional-node';

const result = await requestSponsoredAnchor({
  ipfsCid: 'QmX...',
  contentHash: 'abc123...',
  gpsCoordinates: '14.5995° N, 120.9842° E',
  agencyId: 'SUI_AP_091',
  journalistAddress: '0x...',
});

if (result.success) {
  console.log('Anchored! Manifest ID:', result.manifestId);
}
```

### Python (Community Contribution Welcome)

```python
import requests

response = requests.post('http://localhost:3001/api/anchor-media', json={
    'ipfsCid': 'QmX...',
    'contentHash': 'abc123...',
    'gpsCoordinates': '14.5995° N, 120.9842° E',
    'agencyId': 'SUI_AP_091',
    'journalistAddress': '0x...',
})

if response.json()['success']:
    print('Manifest ID:', response.json()['manifestId'])
```

---

## Changelog

### v1.0.0 (2026-02-17)
- Initial release
- Phase 1: Agency registration and PressPass issuance
- Phase 2: Sponsored media anchoring
- Basic health and info endpoints

---

## Support

- **Documentation**: [GitHub](https://github.com/your-org/suiproof)
- **Issues**: [Report bugs](https://github.com/your-org/suiproof/issues)
- **Discord**: [Join community](#)

---

**Last Updated**: February 17, 2026
