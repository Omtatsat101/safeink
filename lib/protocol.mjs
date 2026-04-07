/**
 * SafeInk Decentralized Protocol
 *
 * NO central server. NO single point of failure. NO entity to subpoena.
 *
 * Architecture:
 * - Letters are encrypted and published to IPFS (permanent, uncensorable)
 * - Journalist nodes subscribe to categories they cover
 * - Community nodes relay and pin content (can't read it — encrypted)
 * - Writer publishes once → letter propagates across the network
 * - No one can take it down. No one can trace the writer.
 *
 * Think: BitTorrent meets Signal meets SecureDrop, but open.
 */

/**
 * Network Topology
 *
 * ┌─────────┐     ┌─────────┐     ┌─────────┐
 * │ Writer  │────>│  IPFS   │<────│Journalist│
 * │  Node   │     │ Network │     │  Node    │
 * └─────────┘     └────┬────┘     └─────────┘
 *                      │
 *                 ┌────┴────┐
 *                 │Community│
 *                 │  Nodes  │
 *                 └─────────┘
 *
 * Writer Node: Browser-based, no install needed. Encrypts + publishes to IPFS.
 * Journalist Node: Subscribes to topics. Decrypts letters addressed to their public key.
 * Community Node: Pins content, relays, can't read (encrypted). Keeps network alive.
 *
 * The SafeInk webapp is ONE node in the network, not THE network.
 * If SafeInk.com goes down, the protocol lives on.
 * Anyone can run a node. The protocol is open.
 */

export const PROTOCOL_VERSION = '0.1.0'

/**
 * Letter envelope — what gets published to IPFS
 * Everything except routing metadata is encrypted.
 */
export const ENVELOPE_SCHEMA = {
  version: 'string',          // protocol version
  id: 'string',               // random UUID (no link to writer)
  timestamp: 'number',        // unix timestamp (rounded to nearest hour for anonymity)
  category: 'string',         // plaintext — so nodes can route without decrypting
  urgency: 'string',          // normal|urgent|crisis
  isPublic: 'boolean',        // if true, content is readable by anyone
  recipientKeys: ['string'],  // public keys of intended recipients (empty = broadcast)
  encryptedContent: 'string', // NaCl box encrypted with recipient's public key
  encryptedReplyKey: 'string',// encrypted key for anonymous reply channel
  signature: 'string',        // signed with writer's ephemeral key (proves same writer, can't identify)
  corroborationHash: 'string',// hash of org/location — for pattern matching without revealing details
}

/**
 * Node types in the network
 */
export const NODE_TYPES = {
  WRITER: {
    role: 'Publish encrypted letters',
    requirements: 'None — browser only, no account, no install',
    canRead: false,
    canPublish: true,
    canRelay: false,
  },
  JOURNALIST: {
    role: 'Receive and investigate letters',
    requirements: 'Registered public key + verified credentials',
    canRead: true,  // only letters encrypted to their key
    canPublish: false,
    canRelay: true,
  },
  COMMUNITY: {
    role: 'Relay and pin content, keep network alive',
    requirements: 'Run the SafeInk node software',
    canRead: false, // content is encrypted
    canPublish: false,
    canRelay: true,
  },
  GATEWAY: {
    role: 'Web gateway for browser-based writers (SafeInk.com)',
    requirements: 'Run the SafeInk gateway + IPFS node',
    canRead: false,
    canPublish: true, // on behalf of writers
    canRelay: true,
  }
}

/**
 * Journalist Registry — decentralized via IPFS/ENS
 *
 * Journalists publish their public key + beats to a shared registry.
 * The registry is on IPFS (can't be censored) and optionally on ENS (Ethereum Name Service).
 * Writers can look up journalists by topic/region and encrypt letters to their key.
 *
 * No central authority controls who can be a journalist.
 * Community vouching + Web of Trust model for verification.
 */
export const JOURNALIST_REGISTRY = {
  // Published to IPFS as a JSON document
  // Any node can verify + mirror it
  schema: {
    publicKey: 'string',       // NaCl public key
    name: 'string',            // display name
    organization: 'string',    // optional
    beats: ['string'],         // topics: workplace, healthcare, education, etc.
    regions: ['string'],       // geographic focus
    credentials: ['string'],   // press card, bylines, org affiliation
    pledges: {
      sourceProtection: 'boolean', // will protect source identity
      noRetaliation: 'boolean',    // will not enable retaliation
      publicInterest: 'boolean',   // will only publish if public interest
    },
    vouchers: ['string'],      // public keys of other journalists who vouch for this one
    proofLinks: ['string'],    // URLs to published work, about page, etc.
    registeredAt: 'number',
  }
}

/**
 * Anonymous Reply Protocol
 *
 * After a journalist reads a letter, they may want to ask follow-up questions.
 * The writer needs to be able to reply WITHOUT revealing their identity.
 *
 * Solution: Ephemeral key pairs + IPFS message drops
 *
 * 1. Writer generates an ephemeral keypair when writing the letter
 * 2. Writer includes their ephemeral PUBLIC key (encrypted) in the letter
 * 3. Journalist encrypts their question to the writer's ephemeral public key
 * 4. Journalist publishes encrypted question to a shared IPFS "dead drop" address
 * 5. Writer checks the dead drop using their letter ID
 * 6. Writer decrypts the question, writes a reply, encrypts to journalist's key
 * 7. Writer publishes reply to the same dead drop
 *
 * Neither party knows the other's identity.
 * The dead drop is an IPFS hash derived from the letter ID — anyone can see
 * messages exist, but only the two parties can read them.
 */
export function createDeadDrop(letterId) {
  // In production: derive IPFS path from letter ID using HKDF
  return `safeink/replies/${letterId}`
}

/**
 * Corroboration Protocol
 *
 * When someone reads a public letter and says "this happened to me too":
 * 1. They hash the organization/location mentioned (without revealing specifics)
 * 2. The hash is published to IPFS as a "corroboration"
 * 3. When N corroborations share the same hash → pattern alert
 * 4. Journalists get notified: "Multiple independent sources report issues at [hash]"
 *
 * No individual can be identified. But patterns become visible.
 */
export function createCorroborationHash(orgName, location) {
  // In production: use Argon2 or bcrypt with a public salt
  // so the same org+location always produces the same hash
  // but the hash can't be reversed to reveal the org
  const input = `${orgName.toLowerCase().trim()}:${location.toLowerCase().trim()}`
  return `corroborate:${simpleHash(input)}`
}

function simpleHash(str) {
  // Placeholder — use crypto.subtle.digest('SHA-256', ...) in production
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/**
 * Gateway API — for the SafeInk.com web app
 *
 * The web app is a GATEWAY node. It provides a friendly UI
 * for writers who don't want to install anything.
 *
 * But it's NOT required. Anyone can:
 * - Run their own gateway
 * - Write letters directly via CLI
 * - Build their own UI on the protocol
 *
 * The protocol is open. SafeInk.com is just one implementation.
 */
export const GATEWAY_ENDPOINTS = {
  // Writer endpoints (no auth)
  'POST /api/publish': 'Publish encrypted letter to IPFS via this gateway',
  'GET /api/status/:id': 'Check if letter was pinned and propagated',
  'GET /api/deadrop/:id': 'Read reply messages from the dead drop',
  'POST /api/deadrop/:id': 'Post reply to the dead drop',
  'POST /api/corroborate': 'Add corroboration to a public letter',

  // Journalist endpoints (key-based auth)
  'GET /api/feed/:publicKey': 'Get letters encrypted to this journalist',
  'GET /api/registry': 'Browse journalist registry',
  'POST /api/registry': 'Register as a journalist (publish public key)',

  // Public endpoints
  'GET /api/public': 'Browse public letters',
  'GET /api/stats': 'Network stats (nodes, letters, corroborations)',
}
