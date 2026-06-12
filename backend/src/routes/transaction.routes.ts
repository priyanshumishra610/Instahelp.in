import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, transactionController.listTransactions);
router.get('/:id', authenticate, transactionController.getTransaction);

export default router;
