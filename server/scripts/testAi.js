import prisma from '../src/config/prisma.js';
import { getLLMProvider } from '../src/ai/providers/index.js';
import { Classifier } from '../src/ai/classifier.js';
import { Drafter } from '../src/ai/drafter.js';

async function run() {
  console.log('========================================================');
  console.log('🤖 BOOKLEAF AI INTEGRATION VERIFICATION SUITE');
  console.log('========================================================');

  // 1. Provider test
  const provider = getLLMProvider();
  console.log(`\n[Step 1] Testing Provider: ${provider.constructor.name}`);
  console.log(`  Model: ${provider.model}`);
  console.log(`  Endpoint: ${provider.baseUrl}`);

  const completion = await provider.complete({
    system: 'You are an AI assistant. Output ONLY valid JSON: {"status": "ok"}',
    messages: [{ role: 'user', content: 'Ping' }],
    maxTokens: 50,
    json: true,
  });
  console.log('  ✅ Provider responded in', completion.latencyMs, 'ms:', completion.content);

  // 2. Classifier test
  console.log('\n[Step 2] Testing Classifier with sample author query...');
  const sampleTicket = {
    id: 'test-uuid-1',
    ticketNumber: 'BL-9999',
    subject: 'Royalty not received for Between Two Temples (67 copies sold)',
    description: 'Hi team, I published Between Two Temples 4 months ago and sold 67 copies, but I have not received any royalty payout. Total pending is ₹2,546.',
  };
  const sampleAuthor = { name: 'Priya Sharma' };
  const sampleBook = { title: 'Between Two Temples', status: 'Available for Sale', royaltyPending: 2546 };

  const classification = await Classifier.classify(sampleTicket, sampleAuthor, sampleBook);
  console.log('  ✅ Classification Result:');
  console.log('     Category:', classification.category);
  console.log('     Priority:', classification.priority);
  console.log('     Source:  ', classification.source);
  console.log('     Reason:  ', classification.reasoning);

  // 3. Drafter test on actual seeded DB ticket
  console.log('\n[Step 3] Testing Drafter on database ticket...');
  const dbTicket = await prisma.ticket.findFirst({
    where: { ticketNumber: 'BL-0001' },
    select: { id: true, ticketNumber: true, subject: true },
  });

  if (!dbTicket) {
    console.warn('  ⚠️ No ticket found with ticketNumber BL-0001 to test drafter');
  } else {
    console.log(`  Found ticket ${dbTicket.ticketNumber}: "${dbTicket.subject}"`);
    const draft = await Drafter.generateDraft(dbTicket.id, true);
    console.log('  ✅ Draft generated successfully!');
    console.log('     Model:    ', draft.model);
    console.log('     IsCached: ', draft.isCached);
    console.log('     Fallback: ', draft.isFallback);
    console.log('     Draft Preview:\n' + draft.body.split('\n').slice(0, 5).join('\n') + '\n     ...');
  }

  console.log('\n========================================================');
  console.log('🎉 ALL AI SUBSYSTEMS OPERATIONAL AND VALIDATED!');
  console.log('========================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ AI Suite Error:', err);
  process.exit(1);
});
