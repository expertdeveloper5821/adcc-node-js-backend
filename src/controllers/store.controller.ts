import { Request, Response } from 'express';
import mongoose from 'mongoose';
import StoreItem from '@/models/store-item.model';
import { sendSuccess } from '@/utils/response';
import { asyncHandler } from '@/utils/async-handler';
import { AppError } from '@/utils/app-error';
import { AuthRequest } from '@/middleware/auth.middleware';
import { t } from '@/utils/i18n';

const isAdmin = (req: AuthRequest): boolean => req.user?.role === 'Admin';

const isOwner = (req: AuthRequest, item: any): boolean => {
  const userId = req.user?.id;
  if (!userId) return false;
  return item.createdBy?.toString?.() === userId.toString();
};

const ensureObjectId = (id: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid item ID', 400);
  }
  return new mongoose.Types.ObjectId(id);
};

/**
 * Create store item
 * POST /v1/store/items
 * Member/Staff
 */
export const createStoreItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const coverImage = req.body.coverImage || (Array.isArray(req.body.photos) ? req.body.photos[0] : undefined);

  const item = await StoreItem.create({
    ...req.body,
    coverImage,
    status: 'Pending',
    isFeatured: false,
    createdBy: userId,
  });

  sendSuccess(res, item, t(lang, 'store.created'), 201);
});

/**
 * List approved store items (public)
 * GET /v1/store/items
 */
export const getStoreItems = asyncHandler(async (req: Request, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { page = 1, limit = 10, category, condition, city, minPrice, maxPrice, q } = req.query as any;

  const filter: any = { status: 'Approved' };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (city) filter.city = city;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (q) {
    filter.$or = [
      { title: { $regex: String(q), $options: 'i' } },
      { description: { $regex: String(q), $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    StoreItem.find(filter)
      .populate('createdBy', 'fullName profileImage')
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StoreItem.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    },
    t(lang, 'store.list')
  );
});

/**
 * Admin list (pending/any status)
 * GET /v1/store/admin/items
 */
export const getAdminStoreItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  if (!isAdmin(req)) {
    throw new AppError(t(lang, 'store.admin_required'), 403);
  }

  const { page = 1, limit = 10, status = 'Pending', category, condition, city, minPrice, maxPrice, q, sellerId } = req.query as any;
  const filter: any = {};
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (city) filter.city = city;
  if (sellerId) filter.createdBy = ensureObjectId(String(sellerId));
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (q) {
    filter.$or = [
      { title: { $regex: String(q), $options: 'i' } },
      { description: { $regex: String(q), $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    StoreItem.find(filter)
      .populate('createdBy', 'fullName profileImage')
      .populate('approvedBy', 'fullName')
      .populate('rejectedBy', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StoreItem.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    },
    t(lang, 'store.admin_list')
  );
});

/**
 * Get my listings
 * GET /v1/store/my-items
 */
export const getMyStoreItems = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(t(lang, 'auth.unauthorized'), 401);
  }

  const { page = 1, limit = 10, status } = req.query as any;
  const filter: any = { createdBy: userId };
  if (status) filter.status = status;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    StoreItem.find(filter)
      .populate('createdBy', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    StoreItem.countDocuments(filter),
  ]);

  sendSuccess(
    res,
    {
      items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    },
    t(lang, 'store.my_list')
  );
});

/**
 * Get store item by ID
 * GET /v1/store/items/:id
 */
export const getStoreItemById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { id } = req.params;
  const item = await StoreItem.findById(id)
    .populate('createdBy', 'fullName profileImage')
    .lean();

  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  const canView = item.status === 'Approved' || isAdmin(req) || isOwner(req, item);
  if (!canView) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  sendSuccess(res, item, t(lang, 'store.details'));
});

/**
 * Update store item
 * PATCH /v1/store/items/:id
 */
export const updateStoreItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { id } = req.params;
  const item = await StoreItem.findById(id);
  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  if (!isAdmin(req) && !isOwner(req, item)) {
    throw new AppError(t(lang, 'store.forbidden'), 403);
  }

  if (item.status === 'Sold' || item.status === 'Archived') {
    throw new AppError(t(lang, 'store.update_not_allowed'), 400);
  }

  const updates = { ...req.body } as any;
  if (updates.photos && !updates.coverImage) {
    updates.coverImage = updates.photos[0];
  }

  if (!isAdmin(req) && item.status === 'Approved') {
    updates.status = 'Pending';
    updates.approvedBy = undefined;
    updates.approvedAt = undefined;
    updates.isFeatured = false;
  }

  const updated = await StoreItem.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('createdBy', 'fullName profileImage')
    .lean();

  sendSuccess(res, updated, t(lang, 'store.updated'));
});

/**
 * Archive store item (soft delete)
 * DELETE /v1/store/items/:id
 */
export const archiveStoreItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { id } = req.params;
  const item = await StoreItem.findById(id);
  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  if (!isAdmin(req) && !isOwner(req, item)) {
    throw new AppError(t(lang, 'store.forbidden'), 403);
  }

  item.status = 'Archived';
  item.isFeatured = false;
  await item.save();

  sendSuccess(res, item, t(lang, 'store.archived'));
});

/**
 * Approve item
 * POST /v1/store/items/:id/approve
 */
export const approveStoreItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  if (!isAdmin(req)) {
    throw new AppError(t(lang, 'store.admin_required'), 403);
  }

  const { id } = req.params;
  const updates: any = {
    status: 'Approved',
    approvedBy: req.user?.id,
    approvedAt: new Date(),
    rejectedBy: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
  };

  if (typeof req.body?.isFeatured === 'boolean') {
    updates.isFeatured = req.body.isFeatured;
  }

  const item = await StoreItem.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate('createdBy', 'fullName profileImage')
    .lean();

  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  sendSuccess(res, item, t(lang, 'store.approved'));
});

/**
 * Reject item
 * POST /v1/store/items/:id/reject
 */
export const rejectStoreItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  if (!isAdmin(req)) {
    throw new AppError(t(lang, 'store.admin_required'), 403);
  }

  const { id } = req.params;
  const item = await StoreItem.findByIdAndUpdate(
    id,
    {
      status: 'Rejected',
      rejectedBy: req.user?.id,
      rejectedAt: new Date(),
      rejectionReason: req.body.reason,
      isFeatured: false,
    },
    { new: true, runValidators: true }
  )
    .populate('createdBy', 'fullName profileImage')
    .lean();

  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  sendSuccess(res, item, t(lang, 'store.rejected'));
});

/**
 * Feature/unfeature item
 * POST /v1/store/items/:id/feature
 */
export const featureStoreItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  if (!isAdmin(req)) {
    throw new AppError(t(lang, 'store.admin_required'), 403);
  }

  const { id } = req.params;
  const item = await StoreItem.findById(id);
  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  if (item.status !== 'Approved') {
    throw new AppError(t(lang, 'store.feature_requires_approval'), 400);
  }

  item.isFeatured = !!req.body.isFeatured;
  await item.save();

  sendSuccess(res, item, t(lang, 'store.featured'));
});

/**
 * Mark item as sold
 * POST /v1/store/items/:id/sold
 */
export const markStoreItemSold = asyncHandler(async (req: AuthRequest, res: Response) => {
  const lang = ((req as any).lang || 'en') as string;
  const { id } = req.params;
  const item = await StoreItem.findById(id);
  if (!item) {
    throw new AppError(t(lang, 'store.not_found'), 404);
  }

  if (!isAdmin(req) && !isOwner(req, item)) {
    throw new AppError(t(lang, 'store.forbidden'), 403);
  }

  item.status = 'Sold';
  item.isFeatured = false;
  await item.save();

  sendSuccess(res, item, t(lang, 'store.sold'));
});
