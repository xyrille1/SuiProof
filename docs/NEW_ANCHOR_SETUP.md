# SuiProof - "+ New Anchor" Setup Guide

## Overview

This guide explains how to set up and use the "+ New Anchor" feature, which implements the complete SuiProof 3-Layer Architecture:

1. **Input Layer (UI/Browser)**: File Hashing (BLAKE2b) & Metadata collection
2. **Storage Layer (Pinata/IPFS)**: Hosting media files and providing CIDs
3. **Consensus Layer (Sui Network)**: Minting MediaManifest objects for proof

## Prerequisites

- Node.js 18+ installed
- A Pinata account with API credentials
- Sui wallet (Slush or compatible)
- SuiProof smart contract deployed on Sui Network

## Setup Instructions

### 1. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Pinata IPFS Configuration
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your_jwt_here
NEXT_PUBLIC_PINATA_GATEWAY=gateway.pinata.cloud

# Sui Network Configuration
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=0x1234...your_package_id_here
```

#### Getting Pinata Credentials:

1. Go to [Pinata.cloud](https://pinata.cloud) and create an account
2. Navigate to API Keys section
3. Create a new API key with "pinFileToIPFS" permission
4. Copy the JWT token to `NEXT_PUBLIC_PINATA_JWT`

#### Getting Sui Package ID:

1. Deploy your Move contract to Sui Network (testnet/mainnet)
2. Copy the package ID from the deployment output
3. Set it in `NEXT_PUBLIC_PACKAGE_ID`

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:9003`

## The 4-Step Technical Flow

### Step 1: Client-Side Preparation

- User drags/uploads an image
- App generates BLAKE2b hash (64-byte) of the file
- GPS coordinates and Agency ID are collected from form inputs

### Step 2: Pinning to Pinata

- File is uploaded to Pinata via the `/pinning/pinFileToIPFS` endpoint
- Pinata returns an IPFS CID (e.g., `Qm...` or `baf...`)
- This happens over HTTPS - no blockchain interaction yet

### Step 3: Slush Wallet Authorization (PTB)

- App creates a Programmable Transaction Block (PTB)
- PTB calls the Move function `suiproof::anchor_original_media`
- Payload includes:
  - IPFS CID (from Step 2)
  - File Hash (from Step 1)
  - GPS Coordinates
  - Agency ID
- User approves transaction in their wallet

### Step 4: Sui Verification

- Sui validators verify the user's PressPass object
- If valid, a MediaManifest object is minted on-chain
- The record is permanent and immutable

## Data Integrity Guarantee

The "Seal of Authenticity" comes from:

- **IPFS CID**: Points to the exact file on IPFS
- **BLAKE2b Hash**: Proves the file hasn't been tampered with
- **Sui Object**: Immutably stores both CID and hash together

If an attacker tries to:

- Swap the photo → Hash won't match
- Change metadata → Sui Object will expose the modification

## Usage

1. **Connect Wallet**: Click "Connect Wallet" in the header
2. **Create New Anchor**: Click "+ New Anchor" button
3. **Upload Image**: Drag and drop or click to select
4. **Enter Metadata**:
   - GPS Coordinates (e.g., `40.7128N, 74.0060W`)
   - Agency ID (e.g., `SUI_AP_091`)
5. **Create Anchor**: Click button and approve in wallet
6. **View Certificate**: Once processed, click "View Certificate" to see the manifest

## Troubleshooting

### "Pinata JWT not configured"

- Ensure `.env.local` exists and contains `NEXT_PUBLIC_PINATA_JWT`
- Restart the dev server after adding environment variables

### "Package ID not configured"

- Add `NEXT_PUBLIC_PACKAGE_ID` to `.env.local`
- Ensure the package is deployed to your target network

### Transaction Fails

- Check wallet balance (need SUI for gas)
- Verify the Move contract is correctly deployed
- Check browser console for detailed error messages

### Image Not Displaying

- Verify Pinata gateway is accessible
- Check browser console for CORS or network errors
- Ensure the CID is valid

## File Structure

```
src/
  ├── app/
  │   ├── actions.ts           # Server actions for Pinata upload
  │   └── page.tsx             # Main page with handleCreateAnchor flow
  ├── components/
  │   ├── new-anchor-modal.tsx # Modal for creating new anchors
  │   ├── manifest-modal.tsx   # Modal for viewing certificates
  │   └── dashboard-view.tsx   # Main dashboard
  └── lib/
      ├── pinata.ts            # Pinata utility functions
      ├── sui.ts               # Sui transaction utilities
      └── data.ts              # Data types and mock data
```

## Next Steps

- [ ] Deploy Move contract to Sui testnet
- [ ] Get Pinata API credentials
- [ ] Configure `.env.local`
- [ ] Test the complete flow
- [ ] Deploy to production

## Support

For issues or questions, refer to:

- [Pinata Documentation](https://docs.pinata.cloud)
- [Sui Documentation](https://docs.sui.io)
- [SuiProof Blueprint](docs/blueprint.md)
