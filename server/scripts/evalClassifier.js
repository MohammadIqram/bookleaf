import { AiFallback } from '../src/ai/fallback.js';

// 15 Comprehensive labeled evaluation test queries (KB calibration queries + edge cases)
const testCases = [
  {
    id: 1,
    subject: 'Delayed royalties for 4 months',
    description: "I published my book 4 months ago and still haven't received any royalty. What's going on?",
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'HIGH',
  },
  {
    id: 2,
    subject: 'Low royalty payout discrepancy',
    description: 'My royalty amount seems too low. I sold 200 copies but only received ₹3,000.',
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'HIGH',
  },
  {
    id: 3,
    subject: 'Wrong ISBN showing on Amazon',
    description: "My book is showing a different ISBN on Amazon than what's on the physical copy.",
    expectedCategory: 'ISBN & Metadata Issues',
    expectedPriority: 'CRITICAL',
  },
  {
    id: 4,
    subject: 'Defective author copies print quality',
    description: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
    expectedCategory: 'Printing & Quality',
    expectedPriority: 'HIGH',
  },
  {
    id: 5,
    subject: 'Amazon listing out of stock',
    description: "My book is published but it's showing as 'Currently Unavailable' on Amazon.",
    expectedCategory: 'Distribution & Availability',
    expectedPriority: 'HIGH',
  },
  {
    id: 6,
    subject: 'Manuscript stuck in typesetting',
    description: "It's been 3 weeks and my book is still in typesetting. When will it be done?",
    expectedCategory: 'Book Status & Production Updates',
    expectedPriority: 'MEDIUM',
  },
  {
    id: 7,
    subject: 'Updating book blurb on Amazon',
    description: 'Can I update the description of my book on Amazon after it is already live?',
    expectedCategory: 'General Inquiry',
    expectedPriority: 'LOW',
  },
  {
    id: 8,
    subject: 'Legal action regarding unpaid money',
    description: 'I have not received my royalties for 8 months. If this is not paid immediately I will consult my lawyer and sue for fraud.',
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'CRITICAL',
  },
  {
    id: 9,
    subject: 'Duplicate barcode scanned at warehouse',
    description: 'The distributor flagged duplicate barcode and ISBN registration colliding with another book.',
    expectedCategory: 'ISBN & Metadata Issues',
    expectedPriority: 'CRITICAL',
  },
  {
    id: 10,
    subject: 'Faded cover spine and loose binding',
    description: 'Three reader copies arrived with broken spine binding and misprinted color.',
    expectedCategory: 'Printing & Quality',
    expectedPriority: 'HIGH',
  },
  {
    id: 11,
    subject: 'Flipkart listing buy button missing',
    description: 'The book link on Flipkart shows stock unavailable and out of stock since Monday.',
    expectedCategory: 'Distribution & Availability',
    expectedPriority: 'HIGH',
  },
  {
    id: 12,
    subject: 'Cover design proofs turnaround',
    description: 'When will the designer send the revised front cover concept for my review?',
    expectedCategory: 'Book Status & Production Updates',
    expectedPriority: 'MEDIUM',
  },
  {
    id: 13,
    subject: 'Author bio and photograph update',
    description: 'I want to update my profile photograph and author bio in the bookstore.',
    expectedCategory: 'General Inquiry',
    expectedPriority: 'LOW',
  },
  {
    id: 14,
    subject: 'Quarterly payout calendar dates',
    description: 'Could you tell me the scheduled dates for the Q3 royalty bank transfer payout?',
    expectedCategory: 'Royalty & Payments',
    expectedPriority: 'MEDIUM',
  },
  {
    id: 15,
    subject: 'Amazon US and UK expansion setup',
    description: 'What are the eligibility requirements to get my book distributed on Amazon US and UK?',
    expectedCategory: 'Distribution & Availability',
    expectedPriority: 'MEDIUM',
  },
];

async function runEvaluation() {
  console.log('🧪 Running BookLeaf Classifier Evaluation (15 Test Cases)...\n');

  let categoryMatches = 0;
  let priorityMatches = 0;

  console.log('| ID | Subject | Expected Cat | Pred Cat | Exp Pri | Pred Pri | Status |');
  console.log('|---|---|---|---|---|---|---|');

  for (const tc of testCases) {
    const result = AiFallback.classifyAndPrioritize(tc.subject, tc.description);

    const catPass = result.category === tc.expectedCategory;
    const priPass = result.priority === tc.expectedPriority;

    if (catPass) categoryMatches++;
    if (priPass) priorityMatches++;

    const status = catPass && priPass ? '✅ PASS' : (catPass ? '⚠️ CAT OK' : '❌ FAIL');

    console.log(
      `| ${tc.id} | ${tc.subject.slice(0, 25)} | ${tc.expectedCategory} | ${result.category} | ${tc.expectedPriority} | ${result.priority} | ${status} |`
    );
  }

  const catAccuracy = Math.round((categoryMatches / testCases.length) * 100);
  const priAccuracy = Math.round((priorityMatches / testCases.length) * 100);

  console.log('\n======================================================');
  console.log(`📊 EVALUATION ACCURACY REPORT:`);
  console.log(`- Category Accuracy:  ${catAccuracy}% (${categoryMatches}/${testCases.length})`);
  console.log(`- Priority Accuracy:  ${priAccuracy}% (${priorityMatches}/${testCases.length})`);
  console.log('======================================================\n');
}

runEvaluation();
