import { Router } from 'express';
import authRoutes from './authRoutes.js';
import bookRoutes from './bookRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import adminRoutes from './adminRoutes.js';
import eventRoutes from './eventRoutes.js';

const router = Router();

// Version 1 Routes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/tickets', ticketRoutes);
router.use('/admin', adminRoutes);
router.use('/events', eventRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'BookLeaf Support API v1',
  });
});

export default router;
