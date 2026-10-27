import { Router } from 'express';
import { getBooks, getBookById } from '../controllers/bookController.js';
import { authenticate } from '../middleware/authenticate.js';

const router = Router();

// Books endpoints require authentication
router.use(authenticate);

router.get('/', getBooks);
router.get('/:id', getBookById);

export default router;
