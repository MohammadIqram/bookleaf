export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;

export const TICKET_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export interface DemoUser {
  name: string;
  email: string;
  role: 'ADMIN' | 'AUTHOR';
  authorCode?: string;
  description: string;
}

export const DEMO_USERS: DemoUser[] = [
  {
    name: 'Super Admin',
    email: 'admin@bookleaf.com',
    role: 'ADMIN',
    description: 'Full portal access, AI drafts, assignment, SLA queue',
  },
  {
    name: 'Support Lead',
    email: 'support.lead@bookleaf.com',
    role: 'ADMIN',
    description: 'Lead support rep managing ticket pipeline',
  },
  {
    name: 'Ananya Reddy',
    email: 'ananya.reddy@email.com',
    role: 'AUTHOR',
    authorCode: 'AUTH003',
    description: 'Between Two Temples (67 sold, ₹2,546 pending, zero paid)',
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@email.com',
    role: 'AUTHOR',
    authorCode: 'AUTH007',
    description: 'Midnight in Mysore (In Production - Cover Design)',
  },
  {
    name: 'Priya Sharma',
    email: 'priya.sharma@email.com',
    role: 'AUTHOR',
    authorCode: 'AUTH001',
    description: 'Whispers of the Ganges (Print defect reported)',
  },
  {
    name: 'Rohit Kapoor',
    email: 'rohit.kapoor@email.com',
    role: 'AUTHOR',
    authorCode: 'AUTH002',
    description: 'Code & Karma (Amazon Unavailable sync)',
  },
  {
    name: 'Vikram Joshi',
    email: 'vikram.joshi@email.com',
    role: 'AUTHOR',
    authorCode: 'AUTH004',
    description: 'Debugging Life (ISBN collision flag)',
  },
  {
    name: 'Meera Nair',
    email: 'meera.nair@email.com',
    role: 'AUTHOR',
    authorCode: 'AUTH005',
    description: 'Cardamom & Chaos (General author bio update)',
  },
];
