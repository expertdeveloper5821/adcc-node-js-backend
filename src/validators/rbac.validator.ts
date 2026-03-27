import { z } from 'zod';

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

export const createPermissionSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_.-]*$/, 'Use lowercase letters, numbers, dots, underscores, hyphens'),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  group: z.string().max(80).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

export const updatePermissionSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  group: z.string().max(80).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

export const permissionIdParamsSchema = z.object({
  permissionId: objectIdString,
});

export const createRoleSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, 'Use lowercase letters, numbers, underscores, hyphens'),
  description: z.string().max(500).optional(),
  permissionIds: z.array(objectIdString).optional().default([]),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
});

export const roleIdParamsSchema = z.object({
  roleId: objectIdString,
});

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(objectIdString),
});

export const assignUserRoleSchema = z.object({
  roleId: objectIdString.nullable(),
});

export const userIdParamsSchema = z.object({
  userId: objectIdString,
});
