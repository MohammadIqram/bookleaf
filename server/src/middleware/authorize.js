import { AppError } from '../utils/AppError.js';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Restricts endpoint execution to specified user roles.
 *
 * @param  {...string} allowedRoles - Array of authorized roles (e.g. 'ADMIN', 'AUTHOR')
 */
export const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized('User context not found. Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

export default authorize;
