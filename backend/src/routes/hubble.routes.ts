import { Router } from 'express';
import * as hubbleController from '../controllers/hubble.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/init', optionalAuth, hubbleController.initSdk);
router.post('/init', optionalAuth, hubbleController.initSdk);
router.post('/sso', hubbleController.ssoCallback);

export default router;
