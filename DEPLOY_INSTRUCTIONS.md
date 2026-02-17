# How to Deploy SuiProof Contract and Get Package ID

## Prerequisites

1. Install Sui CLI if you haven't already:
   ```bash
   cargo install --locked --git https://github.com/MystenLabs/sui.git --branch mainnet sui
   ```

2. Or download from: https://docs.sui.io/guides/developer/getting-started/sui-install

## Step-by-Step Deployment

### 1. Check Sui CLI Installation

```bash
sui --version
```

### 2. Create/Connect Wallet

If you don't have a wallet configured:

```bash
sui client new-address ed25519
```

This will create a new wallet address. **Save the recovery phrase safely!**

### 3. Get Testnet Tokens

**Option A: Using Faucet Website**
- Go to: https://faucet.sui.io/
- Enter your wallet address
- Request tokens

**Option B: Using CLI**
```bash
sui client faucet
```

### 4. Check Your Balance

```bash
sui client gas
```

Make sure you have enough SUI for deployment (at least 0.5 SUI).

### 5. Navigate to Contract Directory

```bash
cd sui
```

### 6. Build the Contract (Optional - to check for errors)

```bash
sui move build
```

If there are any errors, they'll show up here.

### 7. Deploy to Testnet

```bash
sui client publish --gas-budget 100000000
```

**This will:**
- Compile your contract
- Deploy it to Sui testnet
- Return the Package ID

### 8. Save the Package ID

The output will look something like this:

```
╭──────────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                            │
├──────────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                          │
│  ┌──                                                                      │
│  │ ObjectID: 0x1234567890abcdef...                                       │
│  │ Sender: 0x...                                                          │
│  │ Owner: Immutable                                                       │
│  │ ObjectType: 0xABCDEF123456...::suiproof::Manifest  <<<< THIS IS IT!  │
│  └──                                                                      │
╰──────────────────────────────────────────────────────────────────────────╯
```

**Copy the Package ID** (the part before `::suiproof::Manifest`)

Example: If you see `0xABCDEF123456::suiproof::Manifest`, 
your Package ID is: `0xABCDEF123456`

### 9. Update .env.local

Open `.env.local` and add your Package ID:

```env
NEXT_PUBLIC_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
```

### 10. Restart Your Dev Server

```bash
npm run dev
```

## Testing the Deployment

Once deployed, you can test the contract:

```bash
# Check if your package exists
sui client object YOUR_PACKAGE_ID
```

## Troubleshooting

### "Insufficient gas"
- Run `sui client faucet` again to get more testnet tokens

### "Address not found"
- Make sure you've created a wallet: `sui client addresses`

### "Network error"
- Check your network: `sui client active-env`
- Should be on testnet: `sui client switch --env testnet`

### Build Errors
- Check the error message
- Make sure all dependencies are correct in `Move.toml`

## Quick Reference Commands

```bash
# Show active address
sui client active-address

# List all addresses
sui client addresses

# Switch network (if needed)
sui client switch --env testnet

# Get more testnet tokens
sui client faucet

# Check gas/balance
sui client gas
```

## What Happens After Deployment?

Once deployed:
1. Your contract is live on Sui testnet
2. The `Manifest` shared object is created
3. Users can call `anchor_original_media` to create MediaManifest objects
4. Each media file gets a permanent on-chain record

## Moving to Mainnet

When ready for production:

```bash
# Switch to mainnet
sui client switch --env mainnet

# Deploy (requires real SUI tokens)
sui client publish --gas-budget 100000000
```

**Note:** Mainnet deployment requires real SUI tokens (not free testnet tokens).
