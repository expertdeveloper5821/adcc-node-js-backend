import multer from 'multer';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/heic',
  'image/heif',
]);

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error('Only image files are allowed'));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter,
});

export const uploadSingleImage = upload.single('image');
export const uploadMultipleImages = upload.array('images', 10);

export const uploadEventImages = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'eventImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 },

]);

const communityImageFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
]);

export const uploadCommunityImages = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return communityImageFields(req, res, next);
  }
  return next();
};

export const requireMultipartFormData = (req: any, _res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (!contentType.includes('multipart/form-data')) {
    const error = new Error('Content-Type must be multipart/form-data with boundary');
    // @ts-ignore
    error.statusCode = 400;
    return next(error);
  }
  return next();
};
