import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import { validate } from '../middleware/validate';
import { createOrderSchema } from '../validators/schemas';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuth, validate(createOrderSchema), orderController.createOrder);
router.get('/user', authenticate, orderController.getUserOrders);
router.get('/:id', optionalAuth, orderController.getOrder);

export default router;
