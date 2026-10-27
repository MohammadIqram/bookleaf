import { AppError } from '../utils/AppError.js';

/**
 * Higher-order middleware factory for validating request body, query params, or route params with Zod.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
export const validate = (schema, source = 'body') => {
  return (req, _res, next) => {
    const dataToValidate = req[source];
    const result = schema.safeParse(dataToValidate);

    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      return next(
        new AppError('Validation failed', 422, 'VALIDATION_ERROR', formattedErrors)
      );
    }

    // Replace request property with validated & sanitized data
    req[source] = result.data;
    next();
  };
};

export default validate;
