import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Centralized Express Error Handler
 * Enforces standardized JSON error contract:
 * {
 *   "error": {
 *     "code": "STRING_CODE",
 *     "message": "Human readable summary",
 *     "details": [ ... ] // Optional
 *   }
 * }
 */
export const errorHandler = (err, req, res, _next) => {
  let error = err;

  // 1. Convert Prisma Known Request Errors
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` (${err.meta.target.join(', ')})` : '';
    error = AppError.conflict(`A record with this unique value already exists${target}.`, 'DUPLICATE_RESOURCE');
  } else if (err.code === 'P2025') {
    error = AppError.notFound('Requested database record was not found.', 'RECORD_NOT_FOUND');
  } else if (err.code === 'P2003') {
    error = AppError.badRequest('Foreign key constraint violation.', 'INVALID_RELATION');
  }

  // 2. Convert JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = AppError.unauthorized('Invalid authorization token.', 'INVALID_TOKEN');
  } else if (err.name === 'TokenExpiredError') {
    error = AppError.unauthorized('Authorization token has expired.', 'TOKEN_EXPIRED');
  }

  // 3. Fallback for unhandled native/syntax errors
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.isOperational ? error.message : (statusCode === 500 ? 'An unexpected internal server error occurred.' : error.message);

  const requestId = req.id || req.headers['x-request-id'] || 'unknown';

  // 4. Log structured error details (internal logs can include stack traces, responses never do in production)
  logger.error(`[${requestId}] ${req.method} ${req.originalUrl} - ${statusCode} ${errorCode}: ${err.message}`, {
    requestId,
    statusCode,
    code: errorCode,
    url: req.originalUrl,
    method: req.method,
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });

  // 5. Build standardized response payload
  const errorResponse = {
    error: {
      code: errorCode,
      message,
    },
  };

  if (error.details) {
    errorResponse.error.details = error.details;
  }

  // Include requestId in response header and body for debugging
  res.setHeader('x-request-id', requestId);

  // In non-production, attach stack for easy debugging
  if (env.NODE_ENV !== 'production' && !error.isOperational) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;
