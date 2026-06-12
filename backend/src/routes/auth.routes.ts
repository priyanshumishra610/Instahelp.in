import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validate';
import { sendOtpSchema, verifyOtpSchema } from '../validators/schemas';
import { authRateLimiter } from '../middleware/rateLimit';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/send-otp', authRateLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', authRateLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.get('/profile', authenticate, authController.getProfile);

export default router;
