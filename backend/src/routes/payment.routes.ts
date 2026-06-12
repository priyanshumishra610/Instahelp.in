import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { validate } from '../middleware/validate';
import {
  createPaymentSchema,
  verifyPaymentSchema,
  verifyRazorpaySchema,
  refundSchema,
} from '../validators/schemas';
import { paymentRateLimiter } from '../middleware/rateLimit';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/gateways', paymentController.getGateways);
router.post(
  '/create',
  paymentRateLimiter,
  optionalAuth,
  validate(createPaymentSchema),
  paymentController.createPayment
);
router.post('/verify', validate(verifyPaymentSchema), paymentController.verifyPayment);
router.post('/razorpay/verify', validate(verifyRazorpaySchema), paymentController.verifyRazorpayPayment);
router.get('/status/:id', paymentController.getPaymentStatus);
router.get('/callback', paymentController.paymentCallback);
router.post('/webhook', paymentController.paymentWebhook);
router.post(
  '/refund',
  authenticate,
  requireAdmin,
  validate(refundSchema),
  paymentController.refundPayment
);

export default router;
