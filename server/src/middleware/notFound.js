import { AppError } from '../utils/AppError.js';

/**
 * 404 handler for unmatched routes.
 */
export const notFound = (req, _res, next) => {
  next(
    new AppError(
      `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
      404,
      'ENDPOINT_NOT_FOUND'
    )
  );
};

export default notFound;
