# 🔒 SuiProof Security Analysis & Recommendations

## Executive Summary

Your **blockchain-level security is excellent** thanks to Sui's object-capability model and the PressPass NFT system. However, **application-layer security needs immediate attention** for production deployment.

---

## 🛡️ Current Security Strengths (Keep These!)

### 1. **Blockchain Security** ⭐ BEST IN CLASS

- **Sui Object-Capability Model**: Only owners can modify their objects
- **Immutable Provenance**: All anchors permanently recorded on-chain
- **PressPass NFT System**: Unforgeable on-chain credentials
- **No Reentrancy**: Move language prevents reentrancy attacks
- **Type Safety**: Move's strong typing prevents many exploits

**Why This Is Best**: The blockchain layer provides cryptographic guarantees that no centralized system can match. Your content anchoring is **tamper-proof forever**.

### 2. **Content Integrity**

- BLAKE2b-512 hashing (64 bytes = 128 hex chars)
- Content-addressed IPFS storage
- Parent-child provenance linking for edits

### 3. **Sponsored Transactions**

- Institutional node pays gas fees
- Journalists don't need SUI tokens to anchor content
- Transaction sponsorship with PTBs

---

## ⚠️ CRITICAL Security Gaps (Fix Before Production!)

### 1. ❌ **NO API Authentication**

**Risk**: Anyone can spam your institutional node and drain gas funds

**Current State**:

```typescript
// institutional-node/src/index.ts
app.post("/api/anchor-media", async (req, res) => {
  // NO AUTHENTICATION CHECK!
  // Anyone can call this and spend your SUI
});
```

**Fix**: Implement API key authentication

```typescript
// Add to institutional-node/src/index.ts

const API_KEY = process.env.API_KEY || "CHANGE_ME_IN_PRODUCTION";

function authenticateRequest(req: Request, res: Response, next: any) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or missing API key",
    });
  }

  next();
}

// Apply to all endpoints
app.use("/api/", authenticateRequest);
```

**Also Update Frontend**:

```typescript
// src/lib/institutional-node.ts
headers: {
  'Content-Type': 'application/json',
  'X-API-Key': process.env.INSTITUTIONAL_NODE_API_KEY, // Server-side only!
}
```

---

### 2. ❌ **NO Rate Limiting**

**Risk**: DoS attacks, gas fund depletion, service abuse

**Fix**: Add express-rate-limit

```bash
npm install express-rate-limit --prefix institutional-node
```

```typescript
// institutional-node/src/index.ts
import rateLimit from "express-rate-limit";

// Per-journalist rate limit (100 anchors per 15 minutes)
const anchorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  keyGenerator: (req) => req.body.journalistAddress || req.ip,
  message: {
    success: false,
    error: "Rate limit exceeded. Max 100 anchors per 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global rate limit (1000 requests per hour)
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { success: false, error: "Server rate limit exceeded" },
});

app.use("/api/", globalLimiter);
app.post("/api/anchor-media", anchorLimiter, anchorHandler);
```

---

### 3. ❌ **NO Press Pass Validation**

**Risk**: Unauthorized users can anchor content under your agency's name

**Current State**:

```typescript
// Step 2: Optional - Validate journalist's press pass
// TODO: Query blockchain to verify they have a valid PressPass NFT
// For now, we trust the request  ← SECURITY HOLE!
```

**Fix**: Implement on-chain verification

```typescript
// institutional-node/src/index.ts

async function validatePressPass(
  journalistAddress: string,
  agencyId: string,
): Promise<boolean> {
  try {
    // Query for PressPass NFTs owned by journalist
    const ownedObjects = await suiClient.getOwnedObjects({
      owner: journalistAddress,
      filter: {
        StructType: `${process.env.PACKAGE_ID}::suiproof::PressPass`,
      },
      options: { showContent: true },
    });

    // Check if any PressPass is valid
    for (const objData of ownedObjects.data) {
      if (!objData.data) continue;

      const details = await suiClient.getObject({
        id: objData.data.objectId,
        options: { showContent: true },
      });

      const fields = (details.data?.content as any)?.fields;
      if (!fields) continue;

      // Validate: correct agency, active, not expired
      const isCorrectAgency = fields.agency_id === agencyId;
      const isActive = fields.is_active === true;
      const expiresAt = parseInt(fields.expires_at);
      const notExpired = expiresAt === 0 || Date.now() < expiresAt;

      if (isCorrectAgency && isActive && notExpired) {
        console.log(`   ✅ Valid PressPass found: ${objData.data.objectId}`);
        return true;
      }
    }

    console.log(`   ❌ No valid PressPass found for ${journalistAddress}`);
    return false;
  } catch (error) {
    console.error("Error validating PressPass:", error);
    return false; // Fail closed
  }
}

// Use in anchor endpoint:
app.post("/api/anchor-media", async (req, res) => {
  // ... validation ...

  // VERIFY PRESS PASS
  const hasValidPass = await validatePressPass(
    data.journalistAddress,
    data.agencyId,
  );

  if (!hasValidPass) {
    return res.status(403).json({
      success: false,
      error: "No valid PressPass found for this agency",
    });
  }

  // ... continue with transaction ...
});
```

---

### 4. ❌ **CORS Wide Open**

**Risk**: Any website can call your API

**Current State**:

```typescript
app.use(cors()); // Allows ALL origins!
```

**Fix**: Restrict to your frontend domain

```typescript
// institutional-node/src/index.ts
import cors from "cors";

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:9003"],
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-API-Key"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

**Environment Variable**:

```bash
# institutional-node/.env
ALLOWED_ORIGINS=http://localhost:9003,https://yourdomain.com
```

---

### 5. ❌ **Exposed API Keys in Client**

**Risk**: Pinata JWT and other secrets exposed to browser

**Current Problem**:

```typescript
// .env.local - NEXT_PUBLIC_ prefix exposes to client!
NEXT_PUBLIC_PINATA_JWT=your_jwt_here  ← ❌ VISIBLE IN BROWSER!
```

**Fix**: Move to server-side only

```bash
# .env.local - Remove NEXT_PUBLIC_ prefix
PINATA_JWT=your_jwt_here  # Server-side only
PINATA_GATEWAY=gateway.pinata.cloud
```

**Update Server Action**:

```typescript
// src/app/actions.ts
"use server"; // Runs on server only

export async function uploadFileToPinata(formData: FormData) {
  const jwt = process.env.PINATA_JWT; // No NEXT_PUBLIC_!
  // ... rest of code ...
}
```

---

### 6. ❌ **No Request Signing**

**Risk**: Man-in-the-middle attacks, request replay

**Fix**: Implement signed requests

```typescript
// Frontend signs request with wallet
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

async function signRequest(data: any, keypair: Ed25519Keypair) {
  const message = JSON.stringify(data);
  const messageBytes = new TextEncoder().encode(message);
  const signature = await keypair.sign(messageBytes);

  return {
    data,
    signature: Buffer.from(signature).toString("base64"),
    timestamp: Date.now(),
  };
}

// Backend verifies signature
function verifyRequestSignature(req: Request): boolean {
  const { data, signature, timestamp } = req.body;

  // Check timestamp (reject if older than 5 minutes)
  if (Date.now() - timestamp > 5 * 60 * 1000) {
    return false; // Replay attack detection
  }

  // Verify signature matches journalist's public key
  // ... verification logic ...

  return true;
}
```

---

### 7. ❌ **Missing Security Headers**

**Risk**: XSS, clickjacking, MIME sniffing attacks

**Fix**: Add helmet.js

```bash
npm install helmet --prefix institutional-node
```

```typescript
// institutional-node/src/index.ts
import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https://gateway.pinata.cloud"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

**For Next.js Frontend**:

```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};
```

---

### 8. ❌ **No Gas Budget Monitoring**

**Risk**: Running out of funds mid-operation

**Fix**: Add balance monitoring

```typescript
// institutional-node/src/index.ts

async function checkSponsorBalance(): Promise<number> {
  const balance = await suiClient.getBalance({
    owner: sponsorAddress,
  });

  const suiBalance = Number(balance.totalBalance) / 1_000_000_000;
  return suiBalance;
}

// Check balance on startup
async function initializeNode() {
  const balance = await checkSponsorBalance();
  console.log(`💰 Sponsor balance: ${balance.toFixed(4)} SUI`);

  if (balance < 10) {
    console.warn("⚠️  WARNING: Low sponsor balance! Please fund with SUI.");
  }

  // Monitor balance every 5 minutes
  setInterval(
    async () => {
      const currentBalance = await checkSponsorBalance();

      if (currentBalance < 5) {
        console.error(
          `🚨 CRITICAL: Only ${currentBalance.toFixed(4)} SUI remaining!`,
        );
        // TODO: Send alert (email, Slack, etc.)
      } else if (currentBalance < 10) {
        console.warn(`⚠️  Low balance: ${currentBalance.toFixed(4)} SUI`);
      }
    },
    5 * 60 * 1000,
  );
}

initializeNode();
```

---

### 9. ❌ **In-Memory Storage**

**Risk**: Transaction history lost on server restart

**Fix**: Add persistent storage

```bash
npm install better-sqlite3 --prefix institutional-node
npm install @types/better-sqlite3 --save-dev --prefix institutional-node
```

```typescript
// institutional-node/src/database.ts
import Database from "better-sqlite3";

const db = new Database("transactions.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    timestamp INTEGER,
    type TEXT,
    journalist TEXT,
    gas_cost REAL,
    tx_digest TEXT,
    status TEXT,
    details TEXT
  )
`);

export function saveTransaction(record: TransactionRecord) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO transactions 
    (id, timestamp, type, journalist, gas_cost, tx_digest, status, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    record.id,
    record.timestamp,
    record.type,
    record.journalist,
    record.gasCost,
    record.txDigest,
    record.status,
    JSON.stringify(record.details),
  );
}

export function getTransactionHistory() {
  const stmt = db.prepare(
    "SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 1000",
  );
  return stmt.all();
}
```

---

### 10. ❌ **No Audit Logging**

**Risk**: Can't investigate security incidents

**Fix**: Add structured logging

```bash
npm install winston --prefix institutional-node
```

```typescript
// institutional-node/src/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "security.log", level: "warn" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Usage:
logger.info("Anchor request", {
  journalist: data.journalistAddress,
  ipfsCid: data.ipfsCid,
  timestamp: Date.now(),
});

logger.warn("Invalid PressPass", {
  journalist: address,
  agency: agencyId,
});

logger.error("Transaction failed", {
  error: error.message,
  journalist: address,
});
```

---

## 📋 **Implementation Priority**

### Phase 1: Immediate (Before Any Production Use)

1. ✅ API Authentication (API keys)
2. ✅ Rate Limiting
3. ✅ CORS Configuration
4. ✅ Move Pinata JWT to server-side
5. ✅ Press Pass Validation

### Phase 2: Before Public Launch

6. ✅ Security Headers (Helmet)
7. ✅ Gas Budget Monitoring
8. ✅ Request Signing
9. ✅ Audit Logging

### Phase 3: Production Hardening

10. ✅ Persistent Storage
11. ✅ HTTPS Enforcement (use reverse proxy like nginx)
12. ✅ DDoS Protection (Cloudflare)
13. ✅ Automated Security Scanning
14. ✅ Incident Response Plan

---

## 🏆 **Best Security Feature Recommendation**

**Implement Multi-Signature Press Pass Issuance**

Instead of just the agency admin issuing passes, require:

1. Agency admin signature
2. Journalist wallet signature (consent)
3. Optional: Third-party verification (journalism school, press association)

**Why This Is Best**:

- Prevents rogue admins from issuing fake credentials
- Gives journalists control (they must consent)
- Creates stronger provenance trail
- Aligns with decentralized identity principles

**Implementation**:

```move
// sui/sources/suiproof.move

public entry fun issue_press_pass_multisig(
    agency: &AgencyObject,
    journalist_signature: vector<u8>,
    journalist_pubkey: vector<u8>,
    journalist: address,
    journalist_name: vector<u8>,
    expires_at: u64,
    ctx: &mut TxContext,
) {
    // Verify sender is agency admin
    assert!(tx_context::sender(ctx) == agency.admin, E_UNAUTHORIZED);

    // Verify journalist signed consent
    // TODO: Implement signature verification
    // verify_signature(journalist_signature, journalist_pubkey, message);

    // Issue pass (already has both signatures)
    // ... rest of function ...
}
```

---

## 🔐 **Smart Contract Security**

Your Move smart contract is already well-designed! But consider:

### 1. Add Access Control

```move
// Add admin-only functions
public struct AdminCap has key { id: UID }

fun init(ctx: &mut TxContext) {
    // Give admin capability to deployer
    let admin_cap = AdminCap { id: object::new(ctx) };
    transfer::transfer(admin_cap, tx_context::sender(ctx));

    // ... rest of init
}

// Pausable in emergencies
public entry fun pause_anchoring(_: &AdminCap, manifest: &mut Manifest) {
    manifest.is_paused = true;
}
```

### 2. Add Emergency Withdrawal

```move
// In case of critical bug, allow admin to disable specific press passes
public entry fun revoke_press_pass(
    _: &AdminCap,
    press_pass: &mut PressPass
) {
    press_pass.is_active = false;
}
```

### 3. Add Events for Everything

```move
// Add more detailed events for auditing
public struct PressPassRevoked has copy, drop {
    pass_id: ID,
    revoked_by: address,
    reason: String,
    revoked_at: u64,
}
```

---

## 📊 **Security Metrics to Track**

1. **Failed Authentication Attempts** (per IP, per journalist)
2. **Rate Limit Hits** (potential abuse)
3. **Invalid PressPass Requests** (fraudulent activity)
4. **Gas Costs Over Time** (detect abnormal spikes)
5. **Transaction Success Rate** (detect issues)
6. **Average Response Time** (detect DDoS)
7. **Sponsor Balance** (prevent service disruption)

---

## 🎯 **Quick Win: Add This Now**

Create a comprehensive `.env.example` with security comments:

```bash
# institutional-node/.env.example

# ==============================================
# SECURITY CONFIGURATION
# ==============================================

# API Authentication
# Generate with: openssl rand -hex 32
API_KEY=GENERATE_STRONG_KEY_HERE

# Allowed Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:9003,https://yourdomain.com

# Gas Sponsor Private Key
# CRITICAL: Never commit this! Add to .gitignore
# Generate with: sui keytool export --key-identity <address>
SPONSOR_PRIVATE_KEY=suiprivkey1q...

# Gas Alert Thresholds (in SUI)
MIN_BALANCE_WARNING=10
MIN_BALANCE_CRITICAL=5

# Rate Limits
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# ==============================================
# BLOCKCHAIN CONFIGURATION
# ==============================================

SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PACKAGE_ID=0x...

# ==============================================
# LOGGING & MONITORING
# ==============================================

LOG_LEVEL=info
NODE_ENV=production
```

---

## ✅ **Final Checklist**

- [ ] API authentication implemented
- [ ] Rate limiting active
- [ ] CORS restricted to known origins
- [ ] Press Pass validation enforced
- [ ] Security headers configured
- [ ] API keys not exposed to client
- [ ] Gas balance monitoring active
- [ ] HTTPS enforced (production)
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies scanned for vulnerabilities (`npm audit`)
- [ ] Environment variables documented
- [ ] Incident response plan documented
- [ ] Regular security audits scheduled

---

## 📚 **Additional Resources**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Sui Security Best Practices](https://docs.sui.io/guides/developer/advanced/security-best-practices)
- [Move Security Guidelines](https://move-language.github.io/move/security.html)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Remember**: Your blockchain security is already excellent. Focus on hardening the API layer!
