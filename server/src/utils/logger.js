import crypto from 'crypto';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'jwt',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'anthropic_api_key',
  'openai_api_key',
]);

/**
 * Recursively redacts sensitive keys from log objects.
 */
function sanitize(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info: (message, meta = {}) => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message,
        ...sanitize(meta),
      })
    );
  },

  warn: (message, meta = {}) => {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'WARN',
        message,
        ...sanitize(meta),
      })
    );
  },

  error: (message, meta = {}) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        message,
        ...sanitize(meta),
      })
    );
  },

  generateRequestId: () => {
    return 'req_' + crypto.randomBytes(6).toString('hex');
  },
};

export default logger;
