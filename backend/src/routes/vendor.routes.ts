import { Router } from 'express';
import * as vendorController from '../controllers/vendor.controller';
import { validate } from '../middleware/validate';
import { vendorRegisterSchema, vendorUpdateSchema } from '../validators/schemas';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/register', validate(vendorRegisterSchema), vendorController.registerVendor);
router.get('/', vendorController.listVendors);
router.get('/:id', vendorController.getVendor);
router.put('/:id', authenticate, requireAdmin, validate(vendorUpdateSchema), vendorController.updateVendor);

export default router;
