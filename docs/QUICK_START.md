# Quick Start Guide - SuiProof Institutional Node Setup

## Prerequisites

- Node.js 18+ installed
- Sui CLI installed ([Installation Guide](https://docs.sui.io/build/install))
- Sui wallet with testnet SUI (for gas fees)
- Pinata account ([Sign up](https://pinata.cloud))

## 5-Minute Setup

### Step 1: Get Testnet SUI

```bash
# Create a new Sui address (if you don't have one)
sui client new-address ed25519

# Get testnet tokens
sui client faucet

# Check balance
sui client balance
```

### Step 2: Deploy Smart Contract

```bash
cd sui
sui client publish --gas-budget 100000000
```

**Save the Package ID** from the output - you'll need it!

### Step 3: Configure Institutional Node

```bash
cd ../institutional-node
npm install
cp .env.example .env
```

Edit `.env`:
```env
# Get your private key (WARNING: Keep this secret!)
# Run: sui keytool export --key-identity <your-address>
SPONSOR_PRIVATE_KEY=suiprivkey1q...

# Use the Package ID from Step 2
PACKAGE_ID=0x...

# Testnet RPC
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Your agency details
AGENCY_ID=SUI_DEMO_001
AGENCY_NAME=Demo News Agency

# Server config
PORT=3001
```

### Step 4: Start Institutional Node

```bash
npm run dev
```

You should see:
```
🏛️  Institutional Node initialized
📍 Sponsor Address: 0x...
🌐 Network: testnet
📦 Package ID: 0x...
🚀 Institutional Node running on port 3001
```

### Step 5: Configure Frontend

```bash
cd ../
cp .env.local.example .env.local  # If this file doesn't exist, create it
```

Edit `.env.local`:
```env
# Same Package ID from Step 2
NEXT_PUBLIC_PACKAGE_ID=0x...

# Point to your institutional node
NEXT_PUBLIC_INSTITUTIONAL_NODE_URL=http://localhost:3001

# Pinata IPFS (get JWT from https://app.pinata.cloud)
NEXT_PUBLIC_PINATA_JWT=eyJhbG...
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet
```

### Step 6: Install Frontend Dependencies & Run

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Testing the Full Flow

### Test 1: Register Your Agency (One-time)

```bash
curl -X POST http://localhost:3001/api/register-agency \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo News Agency",
    "agencyId": "SUI_DEMO_001"
  }'
```

Look for the transaction digest in the response.

### Test 2: Create a Sponsored Anchor

1. **Open** http://localhost:3000
2. **Connect** your Sui wallet (Suiet, Ethos, etc.)
3. **Click** "+ New Anchor" button
4. **Upload** any image
5. **Enable** "Institutional Sponsorship" toggle (should be ON by default)
6. **Fill in**:
   - GPS: `14.5995° N, 120.9842° E` (Manila, Philippines)
   - Agency ID: `SUI_DEMO_001`
7. **Click** "Create Anchor"

Watch the institutional node terminal - you should see:
```
📸 New anchor request from journalist: 0x...
   IPFS CID: QmX...
   Location: 14.5995° N, 120.9842° E
   ⛽ Sponsoring transaction with gas from: 0x...
   ✅ Transaction executed: 0x...
   📋 Manifest created
```

**The journalist didn't pay gas - the institution did!**

### Test 3: Verify Content

1. **Navigate** to "Verify" tab
2. **Upload** the same image you just anchored
3. **See** GREEN SEAL: "Authentic Media Confirmed"

---

## Troubleshooting

### "Insufficient gas" error

**Solution**: Fund your sponsor account
```bash
sui client faucet
```

### "Package not found" error

**Solution**: Verify your `PACKAGE_ID` in both `.env` files matches the deployed contract

### "CORS error" when calling institutional node

**Solution**: Add your frontend URL to CORS whitelist in `institutional-node/src/index.ts`:
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com']
}));
```

### Pinata upload fails

**Solution**: 
1. Verify your `PINATA_JWT` is correct
2. Check your Pinata account hasn't exceeded free tier limits
3. Try uploading directly at https://app.pinata.cloud to test

---

## Next Steps

1. **Phase 1**: Issue press passes to your team
2. **Phase 2**: Integrate with mobile app
3. **Phase 3**: Set up editor plugins
4. **Phase 4**: Deploy public verifier

See the complete implementation guide: [SOURCE_TO_SCREEN_FLOW.md](./SOURCE_TO_SCREEN_FLOW.md)

---

## Production Deployment

### Institutional Node (Backend)

**Option 1: Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Deploy
railway login
railway init
railway up
```

**Option 2: DigitalOcean App Platform**
1. Push code to GitHub
2. Connect repository to App Platform
3. Set environment variables
4. Deploy

**Security Checklist**:
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS
- [ ] Add API authentication
- [ ] Set up rate limiting
- [ ] Monitor sponsor account balance
- [ ] Use hardware wallet for mainnet sponsor key

### Frontend (Next.js)

**Deploy to Vercel** (recommended):
```bash
npm install -g vercel
vercel
```

Update `.env.local` → Add to Vercel Environment Variables

### Smart Contract (Mainnet)

```bash
# Switch to mainnet
sui client switch --env mainnet

# Ensure you have mainnet SUI
sui client balance

# Deploy
sui client publish --gas-budget 100000000
```

**Update all Package IDs in your configuration files!**

---

## Support

- **Discord**: [Join SuiProof Community](#)
- **GitHub Issues**: [Report bugs](https://github.com/your-repo/issues)
- **Documentation**: See `/docs` folder
