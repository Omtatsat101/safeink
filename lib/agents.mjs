/**
 * SafeInk AI Agents
 *
 * These run on the GATEWAY node only (SafeInk.com or any other gateway).
 * They NEVER see plaintext letter content unless the writer opts in.
 * Default mode: classify based on metadata only.
 */

export const AGENTS = [
  {
    id: 'letter-classifier',
    name: 'Letter Classifier',
    model: 'claude-haiku-4-5-20251001',
    runsOn: 'metadata', // never reads letter content by default
    prompt: `Classify this anonymous letter based on its metadata.

Available categories: workplace, healthcare, education, community, corporate, government, personal, open-letter

You receive ONLY:
- Category (selected by writer)
- Urgency hint (if writer flagged as urgent)
- Word count
- Whether it's marked public

Return JSON: {confirmedCategory, urgency: "normal|urgent|crisis", suggestedRecipientTypes: ["journalist","leader","org","legal"]}`
  },
  {
    id: 'recipient-matcher',
    name: 'Recipient Matcher',
    model: 'claude-haiku-4-5-20251001',
    runsOn: 'metadata',
    prompt: `Match this letter to verified recipients in the journalist registry.

Given:
- Letter category and urgency
- Available recipients with their beats and regions

Return the top 3 matches: [{recipientId, matchReason, confidence}]

Rules:
- Prioritize recipients with source protection pledges
- For crisis letters: include at least one legal aid contact
- For healthcare: include health journalists + patient advocacy
- Never send to more than 3 recipients (reduce exposure risk)`
  },
  {
    id: 'safety-scanner',
    name: 'Safety Scanner',
    model: 'claude-haiku-4-5-20251001',
    runsOn: 'client', // runs IN THE BROWSER, not on server
    prompt: `You are scanning a letter for information that could identify the writer.
Flag any: names, dates, addresses, phone numbers, email addresses, employee IDs,
specific job titles that narrow to one person, unique incidents that are publicly documented.

For each finding, suggest a redaction. Example:
"On March 15, I reported to Dr. Smith" → "Several months ago, I reported to my supervisor"

Return JSON: {identifiers: [{text, type, redactionSuggestion}], riskLevel: "low|medium|high"}`
  },
  {
    id: 'corroboration-engine',
    name: 'Corroboration Engine',
    model: 'claude-sonnet-4-6-20250514',
    runsOn: 'hashes-only', // only sees corroboration hashes, not letter content
    prompt: `Analyze corroboration patterns across anonymous letters.

You see ONLY hashed identifiers (you cannot identify organizations or people).
When multiple letters share the same corroboration hash, it means multiple
independent sources report issues at the same place.

Your job:
1. Detect when a hash reaches threshold (3+ corroborations)
2. Estimate the severity based on urgency flags
3. Recommend whether to alert matched journalists
4. Note if the pattern is accelerating (more reports over time)

Return JSON: {patterns: [{hash, count, urgencyProfile, recommendation, trend}]}`
  },
  {
    id: 'crisis-detector',
    name: 'Crisis Detector',
    model: 'claude-haiku-4-5-20251001',
    runsOn: 'opt-in-only', // only if writer consents to content analysis
    prompt: `Detect if this letter describes an IMMEDIATE safety crisis.

Crisis = imminent physical danger, active abuse, trafficking, suicidal ideation

If crisis detected:
1. Flag for immediate routing to crisis resources
2. Provide hotline numbers appropriate to the category
3. Do NOT delay — crisis letters skip the matching queue

Return JSON: {isCrisis: boolean, crisisType: string, immediateResources: [{name, contact, type}]}

IMPORTANT: False negatives are worse than false positives. When in doubt, flag as crisis.`
  }
]

/**
 * Crisis Resources — shown immediately if crisis detected
 */
export const CRISIS_RESOURCES = [
  { name: '988 Suicide & Crisis Lifeline', contact: 'Call/text 988', type: 'mental-health', region: 'US' },
  { name: 'National Domestic Violence Hotline', contact: '1-800-799-7233', type: 'abuse', region: 'US' },
  { name: 'National Child Abuse Hotline', contact: '1-800-422-4453', type: 'child-abuse', region: 'US' },
  { name: 'National Human Trafficking Hotline', contact: '1-888-373-7888', type: 'trafficking', region: 'US' },
  { name: 'Crisis Text Line', contact: 'Text HOME to 741741', type: 'general', region: 'US' },
  { name: 'RAINN Sexual Assault Hotline', contact: '1-800-656-4673', type: 'sexual-assault', region: 'US' },
  { name: 'Childhelp National Hotline', contact: '1-800-422-4453', type: 'child-abuse', region: 'US' },
]
