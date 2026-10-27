/**
 * Deterministic keyword & rules-based fallback classifier and priority scorer.
 * Invoked if the LLM provider fails, times out, or when circuit breaker is open.
 */
export class AiFallback {
  /**
   * Deterministic classification from subject and description
   *
   * @param {string} subject
   * @param {string} description
   * @returns {{ category: string, priority: string, reasoning: string }}
   */
  static classifyAndPrioritize(subject = '', description = '') {
    const text = `${subject} ${description}`.toLowerCase();

    // 1. Keyword Category Rules
    let category = 'General Inquiry';
    let reasoning = 'Default classification via deterministic rule matching.';

    if (/royalty|payment|payout|paid|bank|ifsc|earnings|account balance/i.test(text)) {
      category = 'Royalty & Payments';
      reasoning = 'Keyword match on royalty, payment, payout, or balance.';
    } else if (/isbn|barcode|asin|metadata|imprint|catalog listing/i.test(text)) {
      category = 'ISBN & Metadata Issues';
      reasoning = 'Keyword match on ISBN, barcode, ASIN, or metadata.';
    } else if (/print|misprint|binding|blurry|quality|paper|defect|reprint/i.test(text)) {
      category = 'Printing & Quality';
      reasoning = 'Keyword match on print quality, binding, blurry pages, or reprint.';
    } else if (/description|blurb|update details/i.test(text) && !/unavailable|out of stock/i.test(text)) {
      category = 'General Inquiry';
      reasoning = 'Author requesting routine description or blurb update.';
    } else if (/unavailable|amazon|flipkart|listing|out of stock|store listing/i.test(text)) {
      category = 'Distribution & Availability';
      reasoning = 'Keyword match on distribution, Amazon/Flipkart listing, or stock availability.';
    } else if (/status|typesetting|cover|proof|when will|stage|progress|manuscript/i.test(text)) {
      category = 'Book Status & Production Updates';
      reasoning = 'Keyword match on production stages, cover design, typesetting, or proofing.';
    }

    // 2. Deterministic Priority Rules
    let priority = 'MEDIUM';

    const isCritical =
      /legal|lawyer|sue|court|fraud|police|threat/i.test(text) ||
      (/isbn/i.test(text) && /wrong|mismatch|duplicate|collision|different/i.test(text)) ||
      (/royalty|payout/i.test(text) && /(?:6\+|[6-9]|1[0-2]|\bmore than 6\b)\s*months|never received|unpaid money/i.test(text));

    const isHigh =
      category === 'ISBN & Metadata Issues' ||
      category === 'Printing & Quality' ||
      /unavailable|out of stock/i.test(text) ||
      /not received|discrepancy|urgent|immediately/i.test(text);

    const isLow =
      /bio|biography|photo|how to|inquiry|question regarding future|update description/i.test(text) &&
      !isCritical &&
      !isHigh;

    if (isCritical) {
      priority = 'CRITICAL';
      reasoning += ' Priority elevated to CRITICAL due to urgency, financial delay, or data integrity concern.';
    } else if (isHigh) {
      priority = 'HIGH';
      reasoning += ' Priority marked as HIGH based on operational impact.';
    } else if (isLow) {
      priority = 'LOW';
      reasoning += ' Priority marked as LOW for routine informational update.';
    }

    return {
      category,
      priority,
      reasoning: `[RULES FALLBACK] ${reasoning}`,
    };
  }

  /**
   * Pre-filled static fallback templates when AI drafting is unavailable
   */
  static getStaticTemplate(category, authorName = 'Author') {
    switch (category) {
      case 'Royalty & Payments':
        return `Dear ${authorName},\n\nThank you for contacting BookLeaf support regarding your royalties. Our royalties are calculated quarterly and distributed within 45 days after quarter-end, provided your balance reaches the ₹1,000 minimum threshold.\n\nOur finance team is currently reviewing your account records. We will verify your payout status and update you within 48 hours.\n\nTeam BookLeaf`;

      case 'ISBN & Metadata Issues':
        return `Dear ${authorName},\n\nThank you for bringing this ISBN/metadata inquiry to our attention. Data accuracy across retail platforms is our top priority.\n\nWe have escalated this issue directly to our production team for immediate verification with official distribution catalogs. We will follow up with you within 48 hours.\n\nTeam BookLeaf`;

      case 'Printing & Quality':
        return `Dear ${authorName},\n\nWe apologise for any quality defects in your printed copies. Please share 2-3 clear photographs showing the misprint or binding issues.\n\nOnce our quality control team reviews the photos, we will arrange a complimentary reprint dispatched within 5–7 business days.\n\nTeam BookLeaf`;

      case 'Distribution & Availability':
        return `Dear ${authorName},\n\nThank you for reaching out regarding your book's platform availability. When listings show as currently unavailable, it is usually a routine catalog synchronization lag between warehouse inventory and platform systems.\n\nOur distribution team has initiated a manual stock re-sync with the platforms. The listing should be live again within 24–48 hours.\n\nTeam BookLeaf`;

      case 'Book Status & Production Updates':
        return `Dear ${authorName},\n\nThank you for checking in on your book's production progress. We are actively coordinating with our editorial and design teams to ensure your manuscript meets all publication standards.\n\nWe will check the exact stage in our production queue and share an updated schedule with you within 48 hours.\n\nTeam BookLeaf`;

      default:
        return `Dear ${authorName},\n\nThank you for reaching out to BookLeaf Publishing. We have received your query and our author support team is reviewing the details.\n\nWe will get back to you with a comprehensive response within 48 hours.\n\nTeam BookLeaf`;
    }
  }
}

export default AiFallback;
