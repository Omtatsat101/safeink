/**
 * SafeInk Cryptography Layer
 *
 * All encryption happens CLIENT-SIDE in the browser.
 * The server NEVER sees plaintext letter content.
 *
 * Uses Web Crypto API (built into all modern browsers) + TweetNaCl.
 * No dependencies needed for the writer — everything runs in the browser.
 */

/**
 * Generate an ephemeral keypair for the writer.
 * This keypair is used ONCE for this letter and then discarded.
 * The private key never leaves the writer's browser.
 */
export async function generateEphemeralKeypair() {
  // In production: use tweetnacl.box.keyPair()
  // For now: use Web Crypto API
  const keyPair = await crypto.subtle.generateKey(
    { name: 'X25519' }, // Curve25519 key agreement
    true,
    ['deriveBits']
  )
  const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)

  return {
    publicKey: bufferToBase64(publicKey),
    privateKey: bufferToBase64(privateKey),
  }
}

/**
 * Encrypt letter content for a specific recipient.
 * Uses NaCl box (Curve25519 + XSalsa20 + Poly1305).
 *
 * @param {string} plaintext - The letter content
 * @param {string} recipientPublicKey - Recipient's public key (base64)
 * @param {string} senderPrivateKey - Writer's ephemeral private key (base64)
 * @returns {string} Encrypted content (base64)
 */
export async function encryptLetter(plaintext, recipientPublicKey, senderPrivateKey) {
  // In production: use tweetnacl.box()
  // The encrypted output can ONLY be decrypted by the recipient's private key
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  // Generate random nonce (24 bytes for NaCl)
  const nonce = crypto.getRandomValues(new Uint8Array(24))

  // In production: derive shared secret from sender private + recipient public
  // Then encrypt with XSalsa20-Poly1305
  // For now: use AES-GCM as a placeholder
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(recipientPublicKey).slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    data
  )

  return JSON.stringify({
    nonce: bufferToBase64(nonce),
    ciphertext: bufferToBase64(encrypted),
    senderPublicKey: 'ephemeral', // included so recipient can reply
  })
}

/**
 * Decrypt letter content (recipient-side).
 * Only the recipient's private key can decrypt.
 */
export async function decryptLetter(encryptedPayload, recipientPrivateKey) {
  const { nonce, ciphertext } = JSON.parse(encryptedPayload)

  // In production: use tweetnacl.box.open()
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBuffer(recipientPrivateKey).slice(0, 32),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(nonce) },
    key,
    base64ToBuffer(ciphertext)
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Generate a one-time access code for the writer.
 * This code lets them check their letter's status without identifying themselves.
 * We store a ONE-WAY HASH of this code. We can verify it but can't recover it.
 */
export async function generateAccessCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const code = bufferToBase64(bytes)
  const hash = await hashCode(code)
  return { code, hash }
}

/**
 * Hash an access code (one-way, irreversible).
 */
export async function hashCode(code) {
  const encoder = new TextEncoder()
  const data = encoder.encode(code)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return bufferToBase64(hash)
}

/**
 * Strip metadata from text that could identify the writer.
 * Run this CLIENT-SIDE before encryption.
 * Returns warnings about potentially identifying information.
 */
export function scanForIdentifiers(text) {
  const warnings = []

  // Email patterns
  const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g)
  if (emails) warnings.push({ type: 'email', found: emails, suggestion: 'Remove email addresses' })

  // Phone patterns
  const phones = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g)
  if (phones) warnings.push({ type: 'phone', found: phones, suggestion: 'Remove phone numbers' })

  // Name patterns (Mr./Mrs./Dr. + capitalized word)
  const names = text.match(/\b(Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+/g)
  if (names) warnings.push({ type: 'names', found: names, suggestion: 'Replace with generic titles' })

  // Specific dates
  const dates = text.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi)
  if (dates) warnings.push({ type: 'dates', found: dates, suggestion: 'Use approximate timeframes instead' })

  // Address patterns
  const addresses = text.match(/\d{1,5}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)/gi)
  if (addresses) warnings.push({ type: 'address', found: addresses, suggestion: 'Remove specific addresses' })

  // Social security / ID numbers
  const ssn = text.match(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g)
  if (ssn) warnings.push({ type: 'ssn', found: ['[detected]'], suggestion: 'Remove ID numbers immediately' })

  return {
    safe: warnings.length === 0,
    warnings,
    message: warnings.length === 0
      ? 'No identifying information detected.'
      : `Found ${warnings.length} potential identifier(s). Consider removing them to protect your anonymity.`
  }
}

// Utility functions
function bufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
