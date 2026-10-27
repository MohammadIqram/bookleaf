import { Router } from 'express';
import { login, logout, getMe } from '../controllers/authController.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/authSchemas.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

export default router;
