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
const uploadStoreItemBody = upload.none();
const uploadStoreItemImages = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'photos', maxCount: 10 },
  { name: 'photos[]', maxCount: 10 },
]);

export const uploadEventImages = upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'eventImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 },

]);

export const uploadEventImagesIfMultipart = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return uploadEventImages(req, res, next);
  }
  return next();
};

export const uploadStoreItemBodyIfMultipart = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return uploadStoreItemBody(req, res, next);
  }
  return next();
};

export const uploadStoreItemImagesIfMultipart = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return uploadStoreItemImages(req, res, next);
  }
  return next();
};

export const uploadChallengeImageIfMultipart = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return uploadSingleImage(req, res, next);
  }
  return next();
};

export const uploadBadgeImageIfMultipart = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return uploadSingleImage(req, res, next);
  }
  return next();
};

export const requireParsedMultipartBody = (req: any, _res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  const hasBody = !!req.body && Object.keys(req.body).length > 0;
  const hasFiles =
    Array.isArray(req.files) ? req.files.length > 0 : !!req.files && Object.keys(req.files).length > 0;

  if (!hasBody && !hasFiles) {
    const error = new Error(
      'Multipart form-data was not parsed. Ensure Content-Type includes the multipart boundary and that your proxy forwards it.'
    );
    // @ts-ignore
    error.statusCode = 400;
    return next(error);
  }

  return next();
};

const trackImageFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 10 },
]);

export const uploadTrackImages = (req: any, res: any, next: any) => {
  const contentType = (req.headers['content-type'] || '').toString();
  if (contentType.includes('multipart/form-data')) {
    return trackImageFields(req, res, next);
  }
  return next();
};

const communityImageFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'gallery', maxCount: 10 },
  { name: 'galleryImages', maxCount: 10 },
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
