# SafeInk — Technical Architecture

## Zero-Knowledge Privacy Model

### Principle: We can't betray what we don't have.

```
┌──────────────────────────────────────────────────────────────┐
│                    WRITER'S DEVICE                            │
│                                                              │
│  1. Open SafeInk (no login, no cookies)                      │
│  2. Write letter in browser                                  │
│  3. Client-side encryption (recipient's public key)          │
│  4. Generate one-time access code (hash, not stored plain)   │
│                                                              │
│  Letter is encrypted BEFORE leaving the browser.             │
│  SafeInk server never sees plaintext.                        │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                    SAFEINK EDGE PROXY                         │
│                                                              │
│  - Strips X-Forwarded-For, client IP, user agent             │
│  - Removes all request metadata                              │
│  - Replaces with edge-node identifier only                   │
│  - Rate limits by proof-of-work (no IP-based limiting)       │
│  - Optional: Tor .onion address for max anonymity            │
│                                                              │
│  After this point, the server has NO idea who sent what.     │
└──────────────┬───────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│                    SAFEINK SERVER                             │
│                                                              │
│  Receives:                                                    │
│  - Encrypted letter blob (can't read it)                     │
│  - Category tag (workplace, healthcare, etc.)                │
│  - Routing preference (journalists, leaders, public)         │
│  - One-way hash of session (so writer can check status)      │
│                                                              │
│  Does NOT receive:                                           │
│  - IP address (stripped by edge)                             │
│  - Browser fingerprint (no JS fingerprinting)                │
│  - Location (no geolocation API calls)                       │
│  - Identity (no accounts, no emails for writers)             │
│                                                              │
│  Server actions:                                              │
│  - Store encrypted blob                                       │
│  - Run AI classifier on CATEGORY ONLY (not letter content)   │
│  - Match to verified recipients                               │
│  - Forward encrypted blob to matched recipients               │
│  - Delete after 30 days (configurable)                        │
└──────────────────────────────────────────────────────────────┘
```

### But wait — how does AI classify if it can't read the letter?

Two-tier approach:

**Tier 1: Metadata-only classification (default)**
- Writer selects category manually
- AI matches based on category + routing preference only
- Letter content stays encrypted end-to-end
- Maximum privacy, slightly less accurate matching

**Tier 2: Opt-in AI analysis (writer chooses)**
- Writer can opt in to "Help match my letter better"
- Letter is decrypted server-side, classified by Claude, then re-encrypted
- AI extracts: category, urgency, region, topic keywords
- Plaintext is immediately purged after classification (not stored)
- Better matching, slightly reduced privacy

Writer always chooses. Default is Tier 1 (maximum privacy).

## Database Schema

```sql
-- Letters (encrypted, zero-knowledge)
CREATE TABLE letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encrypted_content BYTEA NOT NULL,        -- E2E encrypted letter
  category VARCHAR(50) NOT NULL,            -- writer-selected category
  routing VARCHAR(50) NOT NULL,             -- journalists|leaders|public|specific
  urgency VARCHAR(20) DEFAULT 'normal',     -- normal|urgent|crisis
  session_hash VARCHAR(64) NOT NULL,        -- one-way hash for status checks
  access_code_hash VARCHAR(64) NOT NULL,    -- one-way hash of writer's access code
  recipient_ids UUID[],                     -- matched recipients
  corroboration_count INT DEFAULT 0,        -- "me too" count
  status VARCHAR(20) DEFAULT 'pending',     -- pending|delivered|read|investigating
  is_public BOOLEAN DEFAULT false,          -- writer chose "publish to all"
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
  -- NO ip_address, NO user_agent, NO location, NO email
);

-- Recipients (verified journalists, leaders, orgs)
CREATE TABLE recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,              -- encrypted at rest
  type VARCHAR(50) NOT NULL,                -- journalist|leader|org|legal|ally
  organization VARCHAR(255),
  public_key TEXT NOT NULL,                 -- for E2E encryption
  beats TEXT[],                             -- topics they cover
  regions TEXT[],                           -- geographic areas
  tier VARCHAR(20) DEFAULT 'pending',       -- pending|verified|trusted
  verification_proof TEXT,
  source_protection_pledge BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Anonymous reply threads (writer <-> recipient)
CREATE TABLE reply_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID REFERENCES letters(id),
  encrypted_messages JSONB DEFAULT '[]',    -- array of {from: 'writer'|'recipient', encrypted_content, timestamp}
  session_hash VARCHAR(64) NOT NULL,        -- matches letter.session_hash
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Corroboration (anonymous "me too")
CREATE TABLE corroborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID REFERENCES letters(id),
  session_hash VARCHAR(64) NOT NULL,        -- different from letter writer
  encrypted_note BYTEA,                     -- optional additional context
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin source management (for public letter feed)
CREATE TABLE admin_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## API Routes

### Writer (no auth required)
```
POST /api/letter              — Submit encrypted letter
GET  /api/letter/status/:hash — Check letter status (via one-time code)
POST /api/letter/reply/:hash  — Reply to recipient's question (anonymous)
POST /api/corroborate/:id     — "Me too" on a public letter
```

### Recipient (auth required)
```
GET  /api/inbox               — Letters matched to this recipient
GET  /api/letter/:id          — Read a letter (decrypts with recipient key)
POST /api/letter/:id/reply    — Ask writer a question (anonymous channel)
PUT  /api/letter/:id/status   — Mark as investigating/resolved
```

### Public
```
GET  /api/public/letters      — Browse public letters
GET  /api/public/letter/:id   — Read a public letter
GET  /api/public/stats        — Platform stats (letters sent, recipients, etc.)
```

### Admin
```
GET  /api/admin/recipients    — Manage verified recipients
POST /api/admin/recipients    — Add recipient
PUT  /api/admin/recipients/:id — Update/verify recipient
GET  /api/admin/metrics       — Platform health
GET  /api/admin/moderation    — Review flagged public letters
```

## AI Agents

### Letter Classifier
- Runs on category metadata (Tier 1) or full content (Tier 2 opt-in)
- Detects urgency level (normal / urgent / crisis)
- Crisis = routes to crisis resources immediately (hotlines, legal aid)

### Recipient Matcher
- Matches letter category + region to journalist beats
- Prioritizes recipients with source protection track record
- Sends to 2-3 recipients max (not broadcast)

### Safety Scanner
- Scans letter BEFORE submission (client-side)
- Warns writer: "Your letter contains details that could identify you"
- Suggests redactions: names, dates, specific locations, job titles
- Writer decides whether to redact or keep

### Corroboration Engine
- When multiple letters describe similar situations at the same organization
- Builds anonymous pattern evidence: "3 independent letters describe X at Y"
- Alerts matched journalists: "Pattern detected — multiple sources"

### Crisis Detector
- Detects imminent danger in letters (violence, self-harm, trafficking)
- Fast-tracks to crisis resources (hotlines, law enforcement contacts)
- Shows writer: "If you're in immediate danger, here's help now"
