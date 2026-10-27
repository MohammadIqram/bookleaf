export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

export const TICKET_PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const USER_ROLES = {
  AUTHOR: 'AUTHOR',
  ADMIN: 'ADMIN',
};

export const SENDER_TYPES = {
  AUTHOR: 'AUTHOR',
  ADMIN: 'ADMIN',
};

export const SOURCE_TYPES = {
  AI: 'AI',
  ADMIN: 'ADMIN',
  RULES: 'RULES',
};

export const AI_STATUSES = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  FAILED: 'FAILED',
};

// Allowed ticket status transitions
export const ALLOWED_STATUS_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['OPEN', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: ['IN_PROGRESS'], // Only admin can reopen
};

// Payout thresholds
export const ROYALTY_PAYOUT_THRESHOLD_INR = 1000;
