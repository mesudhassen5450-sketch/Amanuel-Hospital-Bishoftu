import { Router } from 'express';
import { login, getCurrentUser, logout, updatePresence } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/logout', authenticateToken, logout);
router.post('/presence', authenticateToken, updatePresence);

export default router;
