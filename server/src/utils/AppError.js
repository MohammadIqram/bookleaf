export class AppError extends Error {
  /**
   * @param {string} message - Human readable error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Machine readable error code (e.g. AUTH_FAILED, NOT_FOUND)
   * @param {any} [details=null] - Optional detailed validation or context object
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, code = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED', details = null) {
    return new AppError(message, 401, code, details);
  }

  static forbidden(message = 'Access denied', code = 'FORBIDDEN', details = null) {
    return new AppError(message, 403, code, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details = null) {
    return new AppError(message, 404, code, details);
  }

  static conflict(message, code = 'CONFLICT', details = null) {
    return new AppError(message, 409, code, details);
  }

  static unprocessable(message = 'Validation failed', code = 'VALIDATION_ERROR', details = null) {
    return new AppError(message, 422, code, details);
  }

  static tooManyRequests(message = 'Too many requests, please try again later', code = 'RATE_LIMITED') {
    return new AppError(message, 429, code);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    return new AppError(message, 503, code);
  }
}

export default AppError;
