# SafeInk

**Anonymous letters that reach the people who can help.**

A privacy-first platform where anyone can write an anonymous letter — about workplace abuse, community injustice, health experiences, institutional failures, or anything the world needs to know — and have it routed to verified journalists, community leaders, and advocacy organizations who can investigate, amplify, and act.

## Why

People stay silent because speaking up is dangerous. Retaliation, job loss, social isolation, legal threats — the cost of truth is too high for most people.

SafeInk removes the cost. Write what you know. We protect who you are. Your truth reaches people with the power to act on it.

## How It Works

### For Letter Writers
1. **Visit SafeInk** — no account needed, no email, no tracking
2. **Write your letter** — describe what happened, what you witnessed, what the world should know
3. **Choose routing** — send to journalists, community leaders, a specific organization, or publish for everyone
4. **We protect you** — built-in VPN/proxy, zero-knowledge architecture, no logs, no IP tracking
5. **Your letter arrives** — verified recipients get your anonymous letter with supporting evidence

### For Journalists & Community Leaders
1. **Apply to receive** — verify your credentials and commitment to source protection
2. **Get matched** — our AI matches incoming letters to your beat, region, and expertise
3. **Investigate** — use the anonymous reply channel to ask follow-up questions
4. **Publish** — when the story is ready, SafeInk helps coordinate safe disclosure

### For Everyone
- **Public letters** — browse letters published for the world (writer chose "publish to all")
- **Validation** — community members can corroborate ("I experienced this too")
- **Signal boost** — share anonymized excerpts to social media

## Privacy Architecture

```
Writer's Browser
     ↓
[Tor-compatible relay / Built-in proxy]
     ↓
[SafeInk Edge — strips all metadata]
     ↓
[Zero-knowledge server — no logs, no IPs, no cookies]
     ↓
[Encrypted at rest — only recipient's key can decrypt]
     ↓
[Verified Journalist / Leader receives letter]
     ↓
[Anonymous reply channel — writer can respond without revealing identity]
```

### What we NEVER store
- IP addresses
- Browser fingerprints
- Location data
- Device identifiers
- Cookies or session tokens (stateless auth via one-time codes)
- Real names or emails of letter writers

### What we DO store (encrypted)
- Letter content (E2E encrypted, only recipient can read)
- Routing preferences (which categories/recipients)
- One-way hash of the writer's session (so they can check status, but we can't trace them)
- Corroboration count (how many people confirmed similar experiences)

## Letter Categories

| Category | Description | Routed To |
|----------|-------------|-----------|
| **Workplace** | Harassment, discrimination, unsafe conditions, wage theft | Labor journalists, employment lawyers, EEOC |
| **Healthcare** | Malpractice, denied care, billing fraud, patient safety | Health journalists, patient advocacy orgs |
| **Education** | Bullying, institutional cover-ups, unsafe schools | Education journalists, school boards, parent orgs |
| **Community** | Environmental hazards, housing injustice, local corruption | Local journalists, community organizers, city council |
| **Corporate** | Fraud, safety violations, consumer deception, data abuse | Investigative journalists, regulatory agencies |
| **Government** | Waste, corruption, civil rights violations | Investigative journalists, watchdog orgs, ACLU |
| **Personal** | Abuse, trafficking, exploitation — need help, not just exposure | Crisis orgs, legal aid, victim advocacy |
| **Open Letter** | For the world — no specific routing, published publicly | Everyone (browsable on the site) |

## Recipient Tiers

| Tier | Who | Verification |
|------|-----|-------------|
| **Verified Journalist** | Professional reporters with source protection track record | Press credentials + editorial affiliation |
| **Community Leader** | Elected officials, nonprofit directors, religious leaders | Org verification + public role confirmation |
| **Advocacy Org** | ACLU, EFF, labor unions, patient advocacy groups | 501(c)(3) status + mission alignment |
| **Legal Aid** | Pro bono lawyers, legal clinics, rights organizations | Bar association verification |
| **Trusted Ally** | Individuals with verified commitment to source protection | Community vouching + background check |

## AI Agents

| Agent | Role | Model |
|-------|------|-------|
| **Letter Classifier** | Categorize incoming letters, detect urgency, flag crises | Haiku |
| **Recipient Matcher** | Match letters to the right journalists/leaders by beat and region | Haiku |
| **Safety Scanner** | Detect if letter contains info that could identify the writer — warn them | Haiku |
| **Corroboration Engine** | Find similar letters, build pattern evidence without revealing individuals | Sonnet |
| **Crisis Detector** | Identify letters describing imminent danger — fast-track to crisis resources | Haiku |

## Tech Stack

- **Next.js 15** — Web app (SSR for privacy, no client-side tracking)
- **PostgreSQL** (encrypted at rest) — Letters, recipients, routing
- **Claude API** — Letter classification, recipient matching, safety scanning
- **Tor-compatible** — Works over Tor browser for maximum anonymity
- **Resend** — Deliver letters to verified recipients
- **Vercel Edge Functions** — Metadata stripping at the edge
- **libsodium** — E2E encryption for letter content

## Domain Options

This could live on:
- A new domain (safeink.com, truthletter.com)
- earthmaya.com (if repositioned as "earth + truth")
- Any domain from portfolio that fits the "safe truth-telling" brand

## Part of the Ecosystem

SafeInk is a social good platform. It connects to the broader mission:
- **KiddieDaily** can surface anonymized SafeInk letters about child safety issues
- **Community leaders** found via SafeInk can become KiddieDaily verified sources
- Revenue from the commercial brands (KiddieGo, KiddieSketch) funds SafeInk's operation
