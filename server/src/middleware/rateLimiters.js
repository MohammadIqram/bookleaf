import rateLimit from 'express-rate-limit';

/**
 * Standard error response formatter for rate-limited requests
 */
const rateLimitHandler = (message, code = 'RATE_LIMITED') => (req, res) => {
  res.status(429).json({
    error: {
      code,
      message,
      retryAfter: res.getHeader('Retry-After') || 60,
    },
  });
};

// General API rate limiter (200 requests per 15 minutes)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Too many requests across the API, please try again later.'),
});

// Stricter rate limiter for Authentication endpoints (10 attempts per 15 minutes)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'Too many login attempts from this IP address. Please try again after 15 minutes.',
    'AUTH_RATE_LIMITED'
  ),
});

// Stricter rate limiter for AI generation endpoints (30 requests per minute)
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler(
    'AI request quota temporarily exceeded. Please wait a minute before generating new responses.',
    'AI_RATE_LIMITED'
  ),
});
