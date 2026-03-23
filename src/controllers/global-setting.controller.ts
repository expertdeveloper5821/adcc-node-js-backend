import { Request, Response } from 'express';
import GlobalSetting from '@/models/global-setting.model';
import { t } from '@/utils/i18n';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import { validateSettingValue } from '@/validators/setting-schema-registry';
import { uploadImageBufferToS3 } from '@/services/s3-upload.service';

const normalizeStringArray = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.includes(',')) {
      return trimmed
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        return [];
      }
    }

    return [trimmed];
  }

  return [];
};

const normalizeParamValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const attachSettingImages = async (req: AuthRequest, value: any) => {
  const filesInput = req.files as
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  if (!filesInput) return value;

  const files = Array.isArray(filesInput)
    ? filesInput
    : Object.values(filesInput).flat();

  let nextValue = value;
  if (!nextValue || typeof nextValue !== 'object' || Array.isArray(nextValue)) {
    nextValue = {};
  }

  const ensureSectionsArray = () => {
    if (!Array.isArray(nextValue.sections)) {
      nextValue.sections = [];
    }
  };

  const getOrCreateSection = (sectionKey: string) => {
    ensureSectionsArray();
    let section = nextValue.sections.find((item: any) => item?.key === sectionKey);
    if (!section) {
      section = { key: sectionKey };
      nextValue.sections.push(section);
    }
    return section;
  };

  for (const file of files) {
    const fieldname = file.fieldname || '';
    const uploaded = await uploadImageBufferToS3(
      file.buffer,
      file.mimetype,
      file.originalname,
      'content-sections'
    );

    if (fieldname === 'image') {
      nextValue.image = uploaded.url;
      continue;
    }

    if (fieldname === 'images' || fieldname === 'images[]') {
      nextValue.images = [...(nextValue.images || []), uploaded.url];
      continue;
    }

    if (fieldname.startsWith('image.')) {
      const sectionKey = fieldname.slice('image.'.length);
      if (sectionKey) {
        const section = getOrCreateSection(sectionKey);
        section.image = uploaded.url;
      }
      continue;
    }

    if (fieldname.startsWith('images.')) {
      let sectionKey = fieldname.slice('images.'.length);
      if (sectionKey.endsWith('[]')) {
        sectionKey = sectionKey.slice(0, -2);
      }
      if (sectionKey) {
        const section = getOrCreateSection(sectionKey);
        section.images = [...(section.images || []), uploaded.url];
      }
      continue;
    }
  }

  return nextValue;
};

const parseItemsInput = (value: unknown): Array<Record<string, any>> => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const parseBulkFileField = (fieldname: string): { key: string; type: 'image' | 'images' } | null => {
  if (fieldname.startsWith('image.')) {
    return { key: fieldname.slice('image.'.length), type: 'image' };
  }
  if (fieldname.startsWith('images.')) {
    const raw = fieldname.slice('images.'.length);
    const key = raw.endsWith('[]') ? raw.slice(0, -2) : raw;
    return { key, type: 'images' };
  }
  return null;
};

/**
 * Create global setting
 * POST /v1/settings
 * Admin only
 */
export const createGlobalSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  req.body.value = await attachSettingImages(req, req.body.value);
  const validation = validateSettingValue(req.body.key, req.body.value);
  if (validation.errors?.length) {
    throw new AppError(JSON.stringify(validation.errors, null, 2), 400);
  }
  if (validation.applied) {
    req.body.value = validation.value;
  }

  const existing = await GlobalSetting.findOne({ key: req.body.key });
  if (existing) {
    throw new AppError('Setting key already exists', 400);
  }

  const setting = await GlobalSetting.create(req.body);
  sendSuccess(res, setting, t(lang, 'contentSetting.created'), 201);
});

/**
 * Upsert global setting by key
 * PUT /v1/settings/:key
 * Admin only
 */
export const upsertGlobalSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const key = normalizeParamValue(req.params.key);
  const updateData = { ...req.body, key };

  updateData.value = await attachSettingImages(req, updateData.value);
  const validation = validateSettingValue(key, updateData.value);
  if (validation.errors?.length) {
    throw new AppError(JSON.stringify(validation.errors, null, 2), 400);
  }
  if (validation.applied) {
    updateData.value = validation.value;
  }

  const setting = await GlobalSetting.findOneAndUpdate(
    { key },
    updateData,
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  sendSuccess(res, setting, t(lang, 'contentSetting.updated'), 200);
});

/**
 * Get global settings
 * GET /v1/settings
 * Public
 */
export const getGlobalSettings = asyncHandler(async (req: Request, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { group, key, keys, active, q, page = 1, limit = 50 } = req.query as any;

  const filter: Record<string, any> = {};
  if (group) filter.group = group;
  if (key) filter.key = key;
  if (typeof active === 'boolean') filter.active = active;

  const keyList = normalizeStringArray(keys);
  if (keyList.length) filter.key = { $in: keyList };

  if (q) {
    filter.$or = [
      { key: { $regex: String(q), $options: 'i' } },
      { label: { $regex: String(q), $options: 'i' } },
      { description: { $regex: String(q), $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [settings, total] = await Promise.all([
    GlobalSetting.find(filter).sort({ group: 1, key: 1 }).skip(skip).limit(limitNum).lean(),
    GlobalSetting.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      settings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    },
    t(lang, 'contentSetting.list'),
    200
  );
});

/**
 * Get global setting by key
 * GET /v1/settings/:key
 * Public
 */
export const getGlobalSettingByKey = asyncHandler(async (req: Request, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { key } = req.params;

  const setting = await GlobalSetting.findOne({ key });
  if (!setting) {
    throw new AppError(t(lang, 'contentSetting.not_found'), 404);
  }

  sendSuccess(res, setting, t(lang, 'contentSetting.details'));
});

/**
 * Update global setting
 * PATCH /v1/settings/:key
 * Admin only
 */
export const updateGlobalSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const key = normalizeParamValue(req.params.key);

  if (req.body.value !== undefined) {
    req.body.value = await attachSettingImages(req, req.body.value);
  } else {
    req.body.value = await attachSettingImages(req, undefined);
  }

  if (req.body.value !== undefined) {
    const validation = validateSettingValue(key, req.body.value);
    if (validation.errors?.length) {
      throw new AppError(JSON.stringify(validation.errors, null, 2), 400);
    }
    if (validation.applied) {
      req.body.value = validation.value;
    }
  }

  const setting = await GlobalSetting.findOneAndUpdate(
    { key },
    req.body,
    { new: true, runValidators: true }
  );

  if (!setting) {
    throw new AppError(t(lang, 'contentSetting.not_found'), 404);
  }

  sendSuccess(res, setting, t(lang, 'contentSetting.updated'));
});

/**
 * Delete global setting
 * DELETE /v1/settings/:key
 * Admin only
 */
export const deleteGlobalSetting = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { key } = req.params;

  const setting = await GlobalSetting.findOneAndDelete({ key });
  if (!setting) {
    throw new AppError(t(lang, 'contentSetting.not_found'), 404);
  }

  sendSuccess(res, null, t(lang, 'contentSetting.deleted'));
});

/**
 * Bulk upsert global settings
 * POST /v1/settings/bulk
 * Admin only
 */
export const bulkUpsertGlobalSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const items: Array<Record<string, any>> = parseItemsInput(req.body.items);
  if (items.length === 0) {
    throw new AppError('Items are required', 400);
  }

  const files = (req.files as Express.Multer.File[] | undefined) || [];
  const uploadsByKey = new Map<string, { image?: string; images: string[] }>();

  if (files.length > 0) {
    for (const file of files) {
      const mapping = parseBulkFileField(file.fieldname);
      if (!mapping) {
        throw new AppError(`Unrecognized file field: ${file.fieldname}`, 400);
      }

      const uploaded = await uploadImageBufferToS3(
        file.buffer,
        file.mimetype,
        file.originalname,
        'content-sections'
      );

      const current = uploadsByKey.get(mapping.key) || { images: [] };
      if (mapping.type === 'image') {
        current.image = uploaded.url;
      } else {
        current.images.push(uploaded.url);
      }
      uploadsByKey.set(mapping.key, current);
    }
  }

  const ops = items.map((item) => {
    const key = String(item.key || '').trim();
    if (!key) {
      throw new AppError('Key is required', 400);
    }

    const uploads = uploadsByKey.get(key);
    if (uploads) {
      if (!item.value || typeof item.value !== 'object' || Array.isArray(item.value)) {
        item.value = {};
      }
      if (uploads.image) {
        item.value.image = uploads.image;
      }
      if (uploads.images.length) {
        item.value.images = [...(item.value.images || []), ...uploads.images];
      }
    }

    const validation = validateSettingValue(item.key, item.value);
    if (validation.errors?.length) {
      throw new AppError(JSON.stringify([{ key: item.key, errors: validation.errors }], null, 2), 400);
    }
    if (validation.applied) {
      item.value = validation.value;
    }

    const updateDoc: Record<string, any> = {};
    ['value', 'group', 'label', 'description', 'active'].forEach((field) => {
      if (item[field] !== undefined) updateDoc[field] = item[field];
    });

    return {
      updateOne: {
        filter: { key: item.key },
        update: { $set: updateDoc },
        upsert: true,
      },
    };
  });

  if (ops.length > 0) {
    await GlobalSetting.bulkWrite(ops, { ordered: true });
  }

  const keys = items.map((item) => item.key);
  const settings = await GlobalSetting.find({ key: { $in: keys } }).lean();

  sendSuccess(res, { settings }, t(lang, 'contentSetting.updated'), 200);
});
