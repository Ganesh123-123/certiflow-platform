import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/login', authRateLimiter, (req, res, next) => {
  authController.login(req, res).catch(next);
});

router.get('/profile', authenticate, (req, res, next) => {
  authController.getProfile(req, res).catch(next);
});

export default router;
