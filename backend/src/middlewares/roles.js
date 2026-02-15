const { AuthorizationError } = require('./errorHandler');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  BIKE_MANAGER: 'bike_manager',
  CLEANING_MANAGER: 'cleaning_manager',
  MOTOR_MANAGER: 'motor_manager',
  SERVICE_MANAGER: 'service_manager',
  ROBBY_MANAGER: 'robby_manager',
  CUSTOMER: 'customer',
};

const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 7,
  [ROLES.ADMIN]: 6,
  [ROLES.BIKE_MANAGER]: 3,
  [ROLES.CLEANING_MANAGER]: 3,
  [ROLES.MOTOR_MANAGER]: 3,
  [ROLES.SERVICE_MANAGER]: 3,
  [ROLES.ROBBY_MANAGER]: 3,
  [ROLES.CUSTOMER]: 1,
};

// Check if user has one of the allowed roles
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AuthorizationError('Insufficient role for this action'));
    }

    next();
  };
}

// Check if user is admin or super_admin
function isAdmin(req, res, next) {
  if (!req.user) {
    return next(new AuthorizationError('Authentication required'));
  }

  if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.SUPER_ADMIN) {
    return next(new AuthorizationError('Admin access required'));
  }

  next();
}

// Check if user is super_admin
function isSuperAdmin(req, res, next) {
  if (!req.user) {
    return next(new AuthorizationError('Authentication required'));
  }

  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return next(new AuthorizationError('Super admin access required'));
  }

  next();
}

// Check if user has specific permissions for a category
function hasPermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required'));
    }

    // Admins bypass permission checks
    if (req.user.role === ROLES.ADMIN || req.user.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // Check role-based category access
    const rolePermissionMap = {
      [ROLES.BIKE_MANAGER]: ['bike'],
      [ROLES.CLEANING_MANAGER]: ['cleaning'],
      [ROLES.MOTOR_MANAGER]: ['motor'],
      [ROLES.SERVICE_MANAGER]: ['service'],
    };

    const rolePerms = rolePermissionMap[req.user.role] || [];
    const userPerms = [...rolePerms, ...(req.user.permissions || [])];

    const hasRequired = requiredPermissions.some((perm) => userPerms.includes(perm));

    if (!hasRequired) {
      return next(new AuthorizationError('Insufficient permissions for this action'));
    }

    next();
  };
}

// Check if user can post (admin, managers, or users with post permission)
function canPost(req, res, next) {
  if (!req.user) {
    return next(new AuthorizationError('Authentication required'));
  }

  const canPostRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.ADMIN,
    ROLES.BIKE_MANAGER,
    ROLES.CLEANING_MANAGER,
    ROLES.MOTOR_MANAGER,
    ROLES.SERVICE_MANAGER,
  ];

  if (!canPostRoles.includes(req.user.role)) {
    return next(new AuthorizationError('Only admins and managers can create posts'));
  }

  next();
}

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  authorize,
  isAdmin,
  isSuperAdmin,
  hasPermission,
  canPost,
};
