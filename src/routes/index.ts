import { Router } from 'express';
import exampleRoutes from './example.route';
import authRoutes from './auth.route';
import communityRoutes from './community.route';
import communityRideRoutes from './community-ride.route';
import eventRoutes from './event.route';
import trackRoutes from './track.route';

const router = Router();

// Register all routes
router.use('/auth', authRoutes);
router.use('/examples', exampleRoutes);
router.use('/communities', communityRoutes);
router.use('/community-rides', communityRideRoutes);
router.use('/events', eventRoutes);
router.use('/tracks', trackRoutes);

// Add more routes here as you create them
// router.use('/users', userRoutes);
// router.use('/vendors', vendorRoutes);

export default router;