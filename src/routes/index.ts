import { Router } from 'express';
import exampleRoutes from './example.route';
import authRoutes from './auth.route';

const router = Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/examples', exampleRoutes);

// Add more routes here as you create them
// router.use('/users', userRoutes);
// router.use('/events', eventRoutes);
// router.use('/vendors', vendorRoutes);

export default router;