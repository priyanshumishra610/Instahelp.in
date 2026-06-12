import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { validate } from '../middleware/validate';
import { paymentSettingsSchema } from '../validators/schemas';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/orders', adminController.getOrders);
router.get('/vendors', adminController.getVendors);
router.get('/transactions', adminController.getTransactions);
router.get('/payment-settings', adminController.getPaymentSettings);
router.put('/payment-settings', validate(paymentSettingsSchema), adminController.updatePaymentSettings);

export default router;
