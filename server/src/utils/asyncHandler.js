/**
 * Wraps asynchronous controller route handlers to forward errors to Next.js / Express error middleware.
 * Eliminates repetitive try-catch blocks across controllers.
 *
 * @param {Function} fn - Async express route handler function
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
