import { Router } from 'express';
import exampleRoutes from './example.route';
import authRoutes from './auth.route';
import eventRoutes from './event.route';
import communityRideRoutes from './community-ride.route';

const router = Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/examples', exampleRoutes);
router.use('/events', eventRoutes);
router.use('/community-rides', communityRideRoutes);

// Add more routes here as you create them
// router.use('/users', userRoutes);
// router.use('/vendors', vendorRoutes);

export default router;