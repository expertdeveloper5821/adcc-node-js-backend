import express from 'express';
import { validate } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
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

router.get('/', getAllTracks);
router.get('/:trackId', getTrackById);
router.get('/:trackId/events/results', getTrackResults);  // Track-related event results
router.get('/:trackId/events/:eventId/communities/:Id/photos', trackCommunityPhotos); // Track-related event results with photos for a community
router.get('/:trackId/communities/results', trackCommunityResults); // Track-related event results with photos for a community

// Admin only routes
router.post('/', authenticate, isAdmin, validate(createTrackSchema), createTrack);
router.patch('/:trackId', authenticate, isAdmin, validate(updateTrackSchema) , updateTrack);
router.delete('/:trackId', authenticate, isAdmin, deleteTrack);
router.delete('/:trackId/gallery', authenticate, isAdmin, deleteGalleryImage);
router.patch('/:trackId/archive', authenticate, isAdmin, archiveTrack);
router.patch('/tracks/:trackId/disable', authenticate, isAdmin, disableTrack);
router.patch('/tracks/:trackId/enable', authenticate, isAdmin, enableTrack);

export default router;