import { Router } from 'express';
import { getStats } from '../controllers/adminController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();

// Admin-only endpoints
router.use(authenticate, authorize('ADMIN'));

router.get('/stats', getStats);

export default router;
