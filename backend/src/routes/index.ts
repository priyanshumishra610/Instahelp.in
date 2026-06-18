import { Router } from 'express';
import authRoutes from './auth.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import transactionRoutes from './transaction.routes';
import vendorRoutes from './vendor.routes';
import adminRoutes from './admin.routes';
import hubbleRoutes from './hubble.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/transactions', transactionRoutes);
router.use('/vendors', vendorRoutes);
router.use('/admin', adminRoutes);
router.use('/hubble', hubbleRoutes);

export default router;
