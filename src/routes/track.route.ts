import express from 'express';
import { validate } from '@/middleware/validate.middleware';
import { authenticate } from '@/middleware/auth.middleware';
import { isAdmin } from '@/middleware/role.middleware';
import { uploadMultipleImages, uploadTrackImages, requireParsedMultipartBody } from '@/middleware/upload.middleware';
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
    deleteGalleryImage,
    addTrackGalleryImages
} from '@/controllers/track.controller';

const router = express.Router();

const normalizeTrackFormData = (req: express.Request, _res: express.Response, next: express.NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const body: any = req.body;

    if (body['facilities[]'] !== undefined && body.facilities === undefined) {
      body.facilities = body['facilities[]'];
    }

    if (body.type !== undefined && body.trackType === undefined) {
      body.trackType = body.type;
    }
  }

  next();
};

router.get('/', authenticate, getAllTracks);
router.get('/:trackId', authenticate, getTrackById);
router.get('/:trackId/events/results', authenticate, getTrackResults);  // Track-related event results
router.get('/:trackId/events/:eventId/communities/:Id/photos', authenticate, trackCommunityPhotos); // Track-related event results with photos for a community
router.get('/:trackId/communities/results', authenticate, trackCommunityResults); // Track-related event results with photos for a community

// Admin only routes
router.post(
  '/',
  authenticate,
  isAdmin,
  uploadTrackImages,
  requireParsedMultipartBody,
  normalizeTrackFormData,
  validate(createTrackSchema),
  createTrack
);
router.patch('/:trackId', authenticate, isAdmin, uploadTrackImages, normalizeTrackFormData, validate(updateTrackSchema) , updateTrack);
router.delete('/:trackId', authenticate, isAdmin, deleteTrack);
router.post('/:trackId/gallery', authenticate, isAdmin, uploadMultipleImages, addTrackGalleryImages);
router.delete('/:trackId/gallery', authenticate, deleteGalleryImage);
router.patch('/:trackId/archive', authenticate, archiveTrack);
router.patch('/tracks/:trackId/disable', authenticate, disableTrack);
router.patch('/tracks/:trackId/enable', authenticate, enableTrack);

export default router;
