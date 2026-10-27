export const CLASSIFIER_PROMPT_VERSION = 'v1.0';

export function buildClassifierPrompt({ subject, description, contextFacts }) {
  const safeText = `${subject}\n\n${description}`.slice(0, 1500);

  return `Task: Classify this author support query into EXACTLY ONE category and assign an operational priority score.

Allowed Categories:
1. "Royalty & Payments" (payouts, quarterly cycle, thresholds, calculation, sales counts, bank details)
2. "ISBN & Metadata Issues" (ISBN barcode, incorrect title mapping, author name misspelling, imprint)
3. "Printing & Quality" (misprints, blurry images, cover defects, physical damages, binding issues)
4. "Distribution & Availability" (Amazon/Flipkart listing status, "Currently Unavailable", inventory sync)
5. "Book Status & Production Updates" (manuscript review, cover design, typesetting, proofreading timelines)
6. "General Inquiry" (marketing questions, author bio update, general how-to, account profile)

Priority Guidance:
- CRITICAL: Severe financial or data integrity failures requiring immediate escalation (e.g. wrong ISBN live on Amazon, royalties missing for 6+ months, legal or threat language).
- HIGH: Significant author distress or direct revenue impact (e.g. royalty discrepancies, live book marked "Unavailable" during active promo, severe print defects on author copies).
- MEDIUM: Standard operational delays or inquiries with existing workflow buffers (e.g. production turnaround queries, quarterly payout schedule questions).
- LOW: Informational or cosmetic requests (e.g. updating author bio, Amazon blurb change, general questions).

Context Facts:
- Book Linked: ${contextFacts.hasBookLinked ? 'Yes' : 'No (Account/General)'}
- Book Status: ${contextFacts.bookStatus || 'N/A'}
- Pending Royalty Balance: ₹${contextFacts.pendingRoyalty || 0}
- Months Since Publication / Onboarding: ${contextFacts.monthsElapsed || 0}

Author Query:
<author_query>
${safeText}
</author_query>

Return a STRICT JSON object in this exact schema with no extra text or markdown formatting:
{
  "category": "One of the 6 exact categories above",
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "confidence": 0.0 to 1.0,
  "reasoning": "Concise 1-sentence justification for admins"
}`;
}

export default buildClassifierPrompt;
