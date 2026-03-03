import express from 'express';
import { validate } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin, requireMember } from '@/middleware/role.middleware';
import {  
    createTrackSchema,
    updateTrackSchema
 } from '@/validators/track.validator';
import {
    createTrack,
    getAllTracks,
    getTrackById,
    updateTrack,
    deleteTrack,
    getTrackResults,
    trackCommunityPhotos,
    trackCommunityResults,
    archiveTrack,
    disableTrack,
    enableTrack,
    deleteGalleryImage
} from '@/controllers/track.controller';

const router = express.Router();

// Public routes – guest-accessible (no auth required)
router.get('/', getAllTracks);
router.get('/:trackId', getTrackById);
router.get('/:trackId/events/results', getTrackResults);
router.get('/:trackId/events/:eventId/communities/:Id/photos', trackCommunityPhotos);
router.get('/:trackId/communities/results', trackCommunityResults);

// Admin only routes
router.post('/', authenticate, isAdmin, validate(createTrackSchema), createTrack);
router.patch('/:trackId', authenticate, isAdmin, validate(updateTrackSchema) , updateTrack);
router.delete('/:trackId', authenticate, isAdmin, deleteTrack);
router.delete('/:trackId/gallery', authenticate, requireMember, deleteGalleryImage);
router.patch('/:trackId/archive', authenticate, requireMember, archiveTrack);
router.patch('/tracks/:trackId/disable', authenticate, requireMember, disableTrack);
router.patch('/tracks/:trackId/enable', authenticate, requireMember, enableTrack);

export default router;