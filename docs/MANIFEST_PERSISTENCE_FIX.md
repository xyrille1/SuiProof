# Fix: Manifests Disappearing on Page Refresh

## Problem Analysis

**Issue**: When a user creates a new anchor (mints a MediaManifest), it appears in the dashboard list. However, when the page is refreshed, all newly created manifests disappear, leaving only the default demo manifests.

**Root Cause**:

- React state (`mediaManifests`) was initialized with only the default manifests from `@/lib/data`
- State is stored in memory only
- When the page refreshes, React re-initializes the state to the default values
- No persistence mechanism existed to save user-created manifests

## Solution Implemented

### 1. **LocalStorage Persistence Layer**

Added browser localStorage to persist user-created manifests across page refreshes.

**Key Components:**

```typescript
// Storage key for localStorage
const MANIFESTS_STORAGE_KEY = "suiproof_user_manifests";

// Load manifests on app initialization
function loadManifestsFromStorage(): MediaManifest[] {
  // 1. Check if we're in browser (not SSR)
  // 2. Try to load from localStorage
  // 3. Parse and merge with default manifests
  // 4. Return combined list
}

// Save user manifests to localStorage
function saveManifestsToStorage(manifests: MediaManifest[]) {
  // 1. Filter out default manifests
  // 2. Keep only user-created ones
  // 3. Save to localStorage as JSON
}
```

### 2. **State Initialization**

Changed from static initialization to lazy initialization:

```typescript
// BEFORE (loses data on refresh)
const [mediaManifests, setMediaManifests] = useState<MediaManifest[]>(
  initialMediaManifests,
);

// AFTER (loads from localStorage)
const [mediaManifests, setMediaManifests] = useState<MediaManifest[]>(() =>
  loadManifestsFromStorage(),
);
```

### 3. **Automatic Saving**

Added `useEffect` to automatically save whenever manifests change:

```typescript
useEffect(() => {
  saveManifestsToStorage(mediaManifests);
}, [mediaManifests]);
```

## How It Works

### Data Flow:

```
1. Page Load
   ├─> Load from localStorage
   ├─> Parse user-created manifests
   ├─> Merge with default manifests
   └─> Initialize React state

2. User Creates Anchor
   ├─> Upload to Pinata (get CID)
   ├─> Mint on Sui blockchain (get transaction digest)
   ├─> Create MediaManifest object
   ├─> Add to React state
   └─> useEffect triggers → Save to localStorage

3. Page Refresh
   ├─> Step 1 repeats
   └─> User manifests restored ✅
```

### Storage Strategy:

```
localStorage["suiproof_user_manifests"] = [
  {
    id: "4",
    fileName: "my-photo.jpg",
    ipfsCid: "bafybei...",
    provenanceId: "0xGDeJHy...",
    // ... user-created manifest
  },
  // ... more user manifests
]

Display List = [User Manifests] + [Default Demo Manifests]
```

## Benefits

✅ **Immediate**: Works instantly without backend setup
✅ **Simple**: Uses browser's native storage API
✅ **Persistent**: Survives page refreshes and browser restarts
✅ **Isolated**: Each browser/device has its own storage
✅ **Safe**: Defaults are preserved, only user data is saved

## Limitations & Future Improvements

### Current Limitations:

1. **Single Device**: Data doesn't sync across devices
2. **Browser-Specific**: Different browsers have separate storage
3. **Not Truly Decentralized**: Data is still on user's machine
4. **Can Be Cleared**: User can clear browser data

### Future Enhancement: Blockchain Querying

**The Proper Solution** would be to query MediaManifest objects directly from Sui blockchain:

```typescript
// Future implementation using Sui RPC
async function loadManifestsFromBlockchain(walletAddress: string) {
  const client = new SuiClient({ network: "testnet" });

  // Query all MediaManifest objects owned by the user
  const objects = await client.getOwnedObjects({
    owner: walletAddress,
    filter: {
      StructType: `${PACKAGE_ID}::suiproof::MediaManifest`,
    },
    options: {
      showContent: true,
      showDisplay: true,
    },
  });

  // Transform blockchain objects into MediaManifest format
  return objects.data.map((obj) => ({
    id: obj.data.objectId,
    fileName: obj.data.content.fields.ipfs_cid,
    ipfsCid: obj.data.content.fields.ipfs_cid,
    provenanceId: obj.data.objectId,
    metadata: {
      contentHash: obj.data.content.fields.content_hash,
      gps: obj.data.content.fields.gps_coordinates,
      agencyId: obj.data.content.fields.agency_id,
      captureDate: new Date(obj.data.content.fields.created_at).toUTCString(),
    },
    // ... rest of the fields
  }));
}
```

**Blockchain Approach Benefits:**

- ✅ Multi-device sync (data on blockchain)
- ✅ Truly decentralized (not dependent on localStorage)
- ✅ Verifiable (can prove ownership on-chain)
- ✅ Multi-wallet support (different wallets = different manifests)

**Why Not Implemented Yet:**

- Requires Sui RPC client setup
- Need to handle object parsing from blockchain
- More complex error handling
- Current localStorage solution works immediately

## Testing

### To Test the Fix:

1. **Create an Anchor**:
   - Connect wallet
   - Click "+ New Anchor"
   - Upload image with metadata
   - Approve transaction
   - See manifest appear in list ✅

2. **Refresh Page**:
   - Press F5 or Ctrl+R
   - Manifest should still be visible ✅

3. **Clear Storage** (to test cleanup):
   - Open DevTools → Application → Local Storage
   - Delete `suiproof_user_manifests` key
   - Refresh page
   - Only default manifests should appear

## Files Modified

- **src/app/page.tsx**
  - Added `loadManifestsFromStorage()` function
  - Added `saveManifestsToStorage()` function
  - Changed state initialization to lazy loading
  - Added `useEffect` for auto-saving
  - Added detailed comments explaining the fix

## Migration Path to Blockchain Querying

When ready to upgrade:

1. Install Sui SDK: `npm install @mysten/sui.js`
2. Create `src/lib/sui-client.ts` with RPC setup
3. Add `useEffect` to load on wallet connect:
   ```typescript
   useEffect(() => {
     if (wallet.connected && wallet.account?.address) {
       loadManifestsFromBlockchain(wallet.account.address);
     }
   }, [wallet.connected, wallet.account]);
   ```
4. Keep localStorage as fallback/cache
5. Gradually phase out localStorage

## Summary

**Fixed**: Manifests now persist across page refreshes using browser localStorage.

**How**:

- Load from localStorage on mount
- Save to localStorage on every change
- Merge user manifests with default demo manifests

**Result**: Users can now create anchors and see them persist even after refreshing the browser! 🎉
