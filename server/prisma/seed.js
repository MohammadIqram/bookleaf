import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initPrisma() {
  try {
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { default: pg } = await import('pg');
    if (process.env.DATABASE_URL) {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      return new PrismaClient({ adapter });
    }
  } catch (_e) {
    // Adapter not installed or not Prisma 7, fallback
  }
  return new PrismaClient();
}

let prisma;

// Demo credentials
export const DEMO_AUTHOR_PASSWORD = 'Author@123';
export const DEMO_ADMIN_PASSWORD = 'Admin@123';

async function main() {
  prisma = await initPrisma();
  console.log('🌱 Starting BookLeaf database seeding...');

  // 1. Locate sample data file
  let sampleDataPath = path.join(__dirname, 'bookleaf_sample_data.json');
  if (!fs.existsSync(sampleDataPath)) {
    sampleDataPath = path.join(__dirname, '..', 'bookleaf_sample_data.json');
  }

  if (!fs.existsSync(sampleDataPath)) {
    throw new Error(`Sample data file not found at ${sampleDataPath}`);
  }

  const rawData = fs.readFileSync(sampleDataPath, 'utf-8');
  const sampleData = JSON.parse(rawData);

  // 2. Pre-compute password hashes
  const salt = await bcrypt.genSalt(10);
  const authorPasswordHash = await bcrypt.hash(DEMO_AUTHOR_PASSWORD, salt);
  const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, salt);

  // 3. Upsert Admin Users
  console.log('👤 Seeding admin accounts...');
  const admin1 = await prisma.user.upsert({
    where: { email: 'admin@bookleaf.com' },
    update: {
      name: 'Super Admin',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'admin@bookleaf.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      name: 'Super Admin',
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: 'support.lead@bookleaf.com' },
    update: {
      name: 'Support Lead',
      role: 'ADMIN',
      passwordHash: adminPasswordHash,
    },
    create: {
      email: 'support.lead@bookleaf.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      name: 'Support Lead',
    },
  });

  console.log(`✅ Admins ready: ${admin1.email}, ${admin2.email}`);

  // 4. Seed Authors and Books
  console.log(`📚 Seeding ${sampleData.authors.length} authors and their catalog...`);
  const authorRecords = new Map();
  const bookRecords = new Map();

  for (const authorData of sampleData.authors) {
    // Upsert User for Author
    const user = await prisma.user.upsert({
      where: { email: authorData.email },
      update: {
        name: authorData.name,
        role: 'AUTHOR',
        passwordHash: authorPasswordHash,
      },
      create: {
        email: authorData.email,
        passwordHash: authorPasswordHash,
        role: 'AUTHOR',
        name: authorData.name,
      },
    });

    // Upsert Author
    const author = await prisma.author.upsert({
      where: { authorCode: authorData.author_id },
      update: {
        userId: user.id,
        name: authorData.name,
        phone: authorData.phone,
        city: authorData.city,
        joinedDate: new Date(authorData.joined_date),
      },
      create: {
        userId: user.id,
        authorCode: authorData.author_id,
        name: authorData.name,
        phone: authorData.phone,
        city: authorData.city,
        joinedDate: new Date(authorData.joined_date),
      },
    });

    authorRecords.set(author.authorCode, { author, user });

    // Seed Books for this author
    for (const b of authorData.books) {
      const pubDate = b.publication_date ? new Date(b.publication_date) : null;
      const payoutDate = b.last_royalty_payout_date ? new Date(b.last_royalty_payout_date) : null;

      const book = await prisma.book.upsert({
        where: { bookCode: b.book_id },
        update: {
          authorId: author.id,
          title: b.title,
          isbn: b.isbn,
          genre: b.genre,
          publicationDate: pubDate,
          status: b.status,
          mrp: b.mrp !== null ? Number(b.mrp) : null,
          royaltyPerCopy: b.author_royalty_per_copy !== null ? Number(b.author_royalty_per_copy) : null,
          totalCopiesSold: Number(b.total_copies_sold || 0),
          totalRoyaltyEarned: Number(b.total_royalty_earned || 0),
          royaltyPaid: Number(b.royalty_paid || 0),
          royaltyPending: Number(b.royalty_pending || 0),
          lastPayoutDate: payoutDate,
          printPartner: b.print_partner || null,
          availableOn: Array.isArray(b.available_on) ? b.available_on : [],
        },
        create: {
          bookCode: b.book_id,
          authorId: author.id,
          title: b.title,
          isbn: b.isbn,
          genre: b.genre,
          publicationDate: pubDate,
          status: b.status,
          mrp: b.mrp !== null ? Number(b.mrp) : null,
          royaltyPerCopy: b.author_royalty_per_copy !== null ? Number(b.author_royalty_per_copy) : null,
          totalCopiesSold: Number(b.total_copies_sold || 0),
          totalRoyaltyEarned: Number(b.total_royalty_earned || 0),
          royaltyPaid: Number(b.royalty_paid || 0),
          royaltyPending: Number(b.royalty_pending || 0),
          lastPayoutDate: payoutDate,
          printPartner: b.print_partner || null,
          availableOn: Array.isArray(b.available_on) ? b.available_on : [],
        },
      });

      bookRecords.set(book.bookCode, book);
    }
  }

  console.log(`✅ Seeded ${authorRecords.size} authors and ${bookRecords.size} books.`);

  // 5. Seed Realistic Sample Tickets (~8 tickets covering various edge cases)
  console.log('🎫 Seeding realistic sample support tickets...');

  const sampleTickets = [
    {
      ticketNumber: 'BL-0001',
      authorCode: 'AUTH003', // Ananya Reddy
      bookCode: 'BK005', // Between Two Temples
      subject: 'Royalty not received for Between Two Temples (67 copies sold)',
      description: 'Hi team, I published Between Two Temples 4 months ago and have sold 67 copies according to my dashboard, but I still have not received any royalty payout. Total pending is ₹2,546. Could you please check when this will be credited?',
      category: 'Royalty & Payments',
      categorySource: 'AI',
      priority: 'HIGH',
      prioritySource: 'AI',
      status: 'IN_PROGRESS',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Author inquiries about overdue royalty payment above ₹1,000 threshold with 0 prior payouts.',
      assignedAdminId: admin1.id,
      attachmentNames: ['royalty_summary_oct2025.pdf'],
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'ananya.reddy@email.com',
          body: 'Hi team, I published Between Two Temples 4 months ago and have sold 67 copies according to my dashboard, but I still have not received any royalty payout. Total pending is ₹2,546. Could you please check when this will be credited?',
          isAiDraftBased: false,
          hoursAgo: 48,
        },
        {
          senderType: 'ADMIN',
          senderEmail: 'admin@bookleaf.com',
          body: 'Dear Ananya,\n\nThank you for reaching out. I understand your concern regarding the pending royalty of ₹2,546 for Between Two Temples.\n\nOur quarterly payout cycle ended recently, and disbursements are scheduled within the 45-day post-quarter window. Upon reviewing your account, our finance team noted that bank account details require updated verification in your Author Dashboard.\n\nCould you please verify your bank account number and IFSC code under Dashboard > Payout Settings? Once confirmed, our accounts team will disburse this pending amount in our upcoming payment run within 48 hours.\n\nTeam BookLeaf',
          isAiDraftBased: true,
          hoursAgo: 24,
        },
      ],
      internalNotes: [
        {
          adminEmail: 'admin@bookleaf.com',
          body: 'Checked finance portal: IFSC verification flag was pending. Alerted author via email.',
          hoursAgo: 24,
        },
      ],
    },
    {
      ticketNumber: 'BL-0002',
      authorCode: 'AUTH007', // Sneha Kulkarni
      bookCode: 'BK013', // Midnight in Mysore (In Production)
      subject: 'Status inquiry for Midnight in Mysore cover design stage',
      description: 'Hello BookLeaf team, my manuscript has been in the Cover Design stage for almost 3 weeks now. Could you please give me an update on when the cover proofs will be shared with me for review?',
      category: 'Book Status & Production Updates',
      categorySource: 'AI',
      priority: 'MEDIUM',
      prioritySource: 'AI',
      status: 'OPEN',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Author inquiring about timeline and proofs during in-production Cover Design stage.',
      assignedAdminId: null,
      attachmentNames: [],
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'sneha.kulkarni@email.com',
          body: 'Hello BookLeaf team, my manuscript has been in the Cover Design stage for almost 3 weeks now. Could you please give me an update on when the cover proofs will be shared with me for review?',
          isAiDraftBased: false,
          hoursAgo: 12,
        },
      ],
      internalNotes: [],
    },
    {
      ticketNumber: 'BL-0003',
      authorCode: 'AUTH001', // Priya Sharma
      bookCode: 'BK001', // Whispers of the Ganges
      subject: 'Blurry images and misaligned binding in author copies',
      description: 'I received my batch of 10 author copies today. Unfortunately, the cover colors look washed out and pages 45-60 have visible misalignment with blurred fonts. Please arrange for a replacement.',
      category: 'Printing & Quality',
      categorySource: 'AI',
      priority: 'HIGH',
      prioritySource: 'AI',
      status: 'RESOLVED',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Author reported physical print defect and misalignment on delivered author copies.',
      assignedAdminId: admin2.id,
      attachmentNames: ['defective_page_48.jpg', 'cover_spine_issue.jpg'],
      resolvedHoursAgo: 6,
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'priya.sharma@email.com',
          body: 'I received my batch of 10 author copies today. Unfortunately, the cover colors look washed out and pages 45-60 have visible misalignment with blurred fonts. Please arrange for a replacement.',
          isAiDraftBased: false,
          hoursAgo: 72,
        },
        {
          senderType: 'ADMIN',
          senderEmail: 'support.lead@bookleaf.com',
          body: 'Dear Priya,\n\nWe sincerely apologise for the defective print copies you received. This does not meet our production standards.\n\nWe have reviewed the photos you provided and confirmed the printing misalignment at our Delhi facility. A complimentary reprint batch of 10 copies has been queued with our priority print partner Repro India. Your fresh author copies will be dispatched within 5–7 business days, and tracking details will be sent directly to your phone.\n\nTeam BookLeaf',
          isAiDraftBased: true,
          hoursAgo: 6,
        },
      ],
      internalNotes: [
        {
          adminEmail: 'support.lead@bookleaf.com',
          body: 'Approved reprint batch #RP-9921 with Repro India. Warehouse notified of inspection failure on original run.',
          hoursAgo: 8,
        },
      ],
    },
    {
      ticketNumber: 'BL-0004',
      authorCode: 'AUTH002', // Rohit Kapoor
      bookCode: 'BK003', // Code & Karma
      subject: 'Book showing Currently Unavailable on Amazon India',
      description: 'Several readers informed me today that Code & Karma is showing as Currently Unavailable on Amazon India. It was live and selling fine yesterday. Please help resolve this as I am running an ad campaign.',
      category: 'Distribution & Availability',
      categorySource: 'AI',
      priority: 'HIGH',
      prioritySource: 'AI',
      status: 'IN_PROGRESS',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Live catalog title showing out-of-stock / currently unavailable on Amazon India.',
      assignedAdminId: admin2.id,
      attachmentNames: ['amazon_listing_screenshot.png'],
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'rohit.kapoor@email.com',
          body: 'Several readers informed me today that Code & Karma is showing as Currently Unavailable on Amazon India. It was live and selling fine yesterday. Please help resolve this as I am running an ad campaign.',
          isAiDraftBased: false,
          hoursAgo: 18,
        },
        {
          senderType: 'ADMIN',
          senderEmail: 'support.lead@bookleaf.com',
          body: 'Dear Rohit,\n\nThank you for alerting us promptly. When a live title shows "Currently Unavailable", it is typically an inventory sync lag between our central warehouse and Amazon India.\n\nOur distribution team has manually triggered a catalog stock refresh with Amazon. The inventory count usually reflects live within 24–48 hours. We are monitoring the listing and will confirm once the "Buy Now" button is restored.\n\nTeam BookLeaf',
          isAiDraftBased: true,
          hoursAgo: 10,
        },
      ],
      internalNotes: [
        {
          adminEmail: 'support.lead@bookleaf.com',
          body: 'Triggered EDI stock refresh via Amazon Seller Central. Inventory count set to 150 units.',
          hoursAgo: 10,
        },
      ],
    },
    {
      ticketNumber: 'BL-0005',
      authorCode: 'AUTH004', // Vikram Joshi
      bookCode: 'BK006', // Debugging Life
      subject: 'ISBN mismatch between physical book and Amazon listing',
      description: 'A reader pointed out that the ISBN on Amazon product details (978-93-5XXXX-06-6) links to a different cover title in search, whereas the physical book has our registered imprint. This looks like a duplicate or misassigned ISBN.',
      category: 'ISBN & Metadata Issues',
      categorySource: 'AI',
      priority: 'CRITICAL',
      prioritySource: 'RULES',
      status: 'IN_PROGRESS',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Critical data integrity issue: potential ISBN mismatch or collision on Amazon marketplace.',
      assignedAdminId: admin1.id,
      attachmentNames: [],
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'vikram.joshi@email.com',
          body: 'A reader pointed out that the ISBN on Amazon product details (978-93-5XXXX-06-6) links to a different cover title in search, whereas the physical book has our registered imprint. This looks like a duplicate or misassigned ISBN.',
          isAiDraftBased: false,
          hoursAgo: 8,
        },
      ],
      internalNotes: [
        {
          adminEmail: 'admin@bookleaf.com',
          body: 'Checked Raja Rammohun Roy ISBN agency allocation records. The imprint is correct; Amazon catalog team mapped an erroneous ASIN parent. Escalated ticket to Amazon Publisher support with 48h SLA.',
          hoursAgo: 5,
        },
      ],
    },
    {
      ticketNumber: 'BL-0006',
      authorCode: 'AUTH005', // Meera Nair
      bookCode: null, // General / Account Level
      subject: 'Author bio update and Amazon US listing inquiry',
      description: 'Hello, I have updated my author bio and would like it reflected across all platforms. Also, could you outline the steps and eligibility to get Cardamom & Chaos listed on Amazon US and Amazon UK?',
      category: 'General Inquiry',
      categorySource: 'ADMIN',
      priority: 'LOW',
      prioritySource: 'ADMIN',
      status: 'RESOLVED',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'General author profile metadata update and international distribution information inquiry.',
      assignedAdminId: admin1.id,
      attachmentNames: ['updated_author_bio.docx'],
      resolvedHoursAgo: 2,
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'meera.nair@email.com',
          body: 'Hello, I have updated my author bio and would like it reflected across all platforms. Also, could you outline the steps and eligibility to get Cardamom & Chaos listed on Amazon US and Amazon UK?',
          isAiDraftBased: false,
          hoursAgo: 30,
        },
        {
          senderType: 'ADMIN',
          senderEmail: 'admin@bookleaf.com',
          body: 'Dear Meera,\n\nThank you for reaching out! You can easily update your author bio from your Author Dashboard under Profile Settings; changes take effect immediately on the BookLeaf Store and sync to Amazon India within 3–5 business days.\n\nRegarding international distribution: Cardamom & Chaos is eligible for our Global Distribution Add-On. Our team will email you the international distribution form along with US/UK pricing tiers by tomorrow.\n\nTeam BookLeaf',
          isAiDraftBased: false,
          hoursAgo: 2,
        },
      ],
      internalNotes: [],
    },
    {
      ticketNumber: 'BL-0007',
      authorCode: 'AUTH006', // Arjun Malhotra
      bookCode: 'BK010', // Turban Tales
      subject: 'Quarterly payout schedule inquiry for September release',
      description: 'Hi BookLeaf, my book Turban Tales went live in September 2024. I currently have 88 copies sold and ₹2,464 pending royalty. When does the next quarterly disbursement cycle take place?',
      category: 'Royalty & Payments',
      categorySource: 'AI',
      priority: 'MEDIUM',
      prioritySource: 'AI',
      status: 'OPEN',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Standard author inquiry regarding quarterly royalty schedule and payout dates.',
      assignedAdminId: null,
      attachmentNames: [],
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'arjun.malhotra@email.com',
          body: 'Hi BookLeaf, my book Turban Tales went live in September 2024. I currently have 88 copies sold and ₹2,464 pending royalty. When does the next quarterly disbursement cycle take place?',
          isAiDraftBased: false,
          hoursAgo: 5,
        },
      ],
      internalNotes: [],
    },
    {
      ticketNumber: 'BL-0008',
      authorCode: 'AUTH009', // Kavita Deshmukh
      bookCode: 'BK015', // Raising Roots (In Production - Typesetting)
      subject: 'Turnaround time for final proofreading and ISBN assignment',
      description: 'Hello, I approved the interior typesetting layout last week for Raising Roots. Could you tell me approximately how many days the proofreading stage will take before ISBN assignment and printing?',
      category: 'Book Status & Production Updates',
      categorySource: 'AI',
      priority: 'LOW',
      prioritySource: 'AI',
      status: 'OPEN',
      aiClassificationStatus: 'DONE',
      aiReasoning: 'Author inquiring about turnaround times between typesetting, proofreading, and ISBN assignment.',
      assignedAdminId: null,
      attachmentNames: [],
      messages: [
        {
          senderType: 'AUTHOR',
          senderEmail: 'kavita.deshmukh@email.com',
          body: 'Hello, I approved the interior typesetting layout last week for Raising Roots. Could you tell me approximately how many days the proofreading stage will take before ISBN assignment and printing?',
          isAiDraftBased: false,
          hoursAgo: 2,
        },
      ],
      internalNotes: [],
    },
  ];

  for (const t of sampleTickets) {
    const authorData = authorRecords.get(t.authorCode);
    if (!authorData) {
      console.warn(`Author ${t.authorCode} not found for ticket ${t.ticketNumber}`);
      continue;
    }

    const book = t.bookCode ? bookRecords.get(t.bookCode) : null;
    const now = new Date();
    const createdAt = new Date(now.getTime() - (t.messages[0]?.hoursAgo || 1) * 3600 * 1000);
    const resolvedAt = t.resolvedHoursAgo
      ? new Date(now.getTime() - t.resolvedHoursAgo * 3600 * 1000)
      : null;

    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        authorId: authorData.author.id,
        bookId: book ? book.id : null,
        subject: t.subject,
        description: t.description,
        status: t.status,
        category: t.category,
        categorySource: t.categorySource,
        priority: t.priority,
        prioritySource: t.prioritySource,
        aiClassificationStatus: t.aiClassificationStatus,
        aiReasoning: t.aiReasoning,
        assignedAdminId: t.assignedAdminId,
        attachmentNames: t.attachmentNames,
        resolvedAt: resolvedAt,
      },
      create: {
        ticketNumber: t.ticketNumber,
        authorId: authorData.author.id,
        bookId: book ? book.id : null,
        subject: t.subject,
        description: t.description,
        status: t.status,
        category: t.category,
        categorySource: t.categorySource,
        priority: t.priority,
        prioritySource: t.prioritySource,
        aiClassificationStatus: t.aiClassificationStatus,
        aiReasoning: t.aiReasoning,
        assignedAdminId: t.assignedAdminId,
        attachmentNames: t.attachmentNames,
        createdAt: createdAt,
        resolvedAt: resolvedAt,
      },
    });

    // Seed Messages (clear existing for idempotency)
    await prisma.ticketMessage.deleteMany({
      where: { ticketId: ticket.id },
    });

    for (const msg of t.messages) {
      let sender = await prisma.user.findUnique({
        where: { email: msg.senderEmail },
      });
      if (!sender) {
        sender = authorData.user;
      }

      const msgTime = new Date(now.getTime() - msg.hoursAgo * 3600 * 1000);
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: msg.senderType,
          senderId: sender.id,
          body: msg.body,
          isAiDraftBased: msg.isAiDraftBased,
          createdAt: msgTime,
        },
      });
    }

    // Seed Internal Notes (clear existing for idempotency)
    await prisma.internalNote.deleteMany({
      where: { ticketId: ticket.id },
    });

    for (const note of t.internalNotes) {
      const admin = await prisma.user.findUnique({
        where: { email: note.adminEmail },
      });
      if (!admin) continue;

      const noteTime = new Date(now.getTime() - note.hoursAgo * 3600 * 1000);
      await prisma.internalNote.create({
        data: {
          ticketId: ticket.id,
          adminId: admin.id,
          body: note.body,
          createdAt: noteTime,
        },
      });
    }
  }

  console.log('✅ Successfully seeded sample support tickets, messages, and internal notes.');
  console.log('========================================================');
  console.log('🎉 BOOKLEAF DATABASE SEED COMPLETED SUCCESSFULLY!');
  console.log('Demo Credentials:');
  console.log(`- Super Admin:   admin@bookleaf.com / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`- Support Lead:  support.lead@bookleaf.com / ${DEMO_ADMIN_PASSWORD}`);
  console.log(`- Authors (10):  <author.email> / ${DEMO_AUTHOR_PASSWORD}`);
  console.log('  e.g., priya.sharma@email.com, ananya.reddy@email.com, sneha.kulkarni@email.com');
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
