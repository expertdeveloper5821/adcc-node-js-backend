import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { authenticatedOnly } from '@/middleware/role.middleware';
import { requireStaffPermission } from '@/middleware/rbac.middleware';
import { validate, validateParams } from '@/middleware/validate.middleware';
import {
  assignUserRole,
  createPermission,
  createRole,
  deletePermission,
  deleteRole,
  getMyPermissions,
  getPermissionMatrix,
  getRoleById,
  listPermissions,
  listRoles,
  seedRbacDefaults,
  setRolePermissions,
  updatePermission,
  updateRole,
} from '@/controllers/rbac.controller';
import {
  assignUserRoleSchema,
  createPermissionSchema,
  createRoleSchema,
  permissionIdParamsSchema,
  roleIdParamsSchema,
  setRolePermissionsSchema,
  updatePermissionSchema,
  updateRoleSchema,
  userIdParamsSchema,
} from '@/validators/rbac.validator';

const router = Router();

const rbacManage = [authenticate, requireStaffPermission('admin.manage_roles')];

router.get('/me/permissions', authenticate, authenticatedOnly, getMyPermissions);

router.get('/matrix', ...rbacManage, getPermissionMatrix);

router.get('/permissions', ...rbacManage, listPermissions);
router.post('/permissions', ...rbacManage, validate(createPermissionSchema), createPermission);
router.patch(
  '/permissions/:permissionId',
  ...rbacManage,
  validateParams(permissionIdParamsSchema),
  validate(updatePermissionSchema),
  updatePermission
);
router.delete(
  '/permissions/:permissionId',
  ...rbacManage,
  validateParams(permissionIdParamsSchema),
  deletePermission
);

router.get('/roles', ...rbacManage, listRoles);
router.post('/roles', ...rbacManage, validate(createRoleSchema), createRole);
router.get('/roles/:roleId', ...rbacManage, validateParams(roleIdParamsSchema), getRoleById);
router.patch(
  '/roles/:roleId',
  ...rbacManage,
  validateParams(roleIdParamsSchema),
  validate(updateRoleSchema),
  updateRole
);
router.delete('/roles/:roleId', ...rbacManage, validateParams(roleIdParamsSchema), deleteRole);
router.put(
  '/roles/:roleId/permissions',
  ...rbacManage,
  validateParams(roleIdParamsSchema),
  validate(setRolePermissionsSchema),
  setRolePermissions
);

router.patch(
  '/users/:userId/role',
  ...rbacManage,
  validateParams(userIdParamsSchema),
  validate(assignUserRoleSchema),
  assignUserRole
);

router.post('/seed', authenticate, seedRbacDefaults);

export default router;
