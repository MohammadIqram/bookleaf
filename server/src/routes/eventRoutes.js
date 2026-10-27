import { Router } from 'express';
import { streamEvents } from '../controllers/sseController.js';

const router = Router();

// Stream endpoint handles authentication via Bearer header, cookie, or ?token= query parameter
router.get('/', streamEvents);

export default router;
