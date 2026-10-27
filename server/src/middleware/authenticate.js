import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import prisma from '../config/prisma.js';

/**
 * Extracts JWT token from Authorization header (Bearer <token>) or Cookie header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  // Fallback to cookie if present
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').map((c) => c.trim());
    const tokenCookie = cookies.find((c) => c.startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
  }

  return null;
}

/**
 * Express middleware to verify JWT and attach user context to req.user
 */
export const authenticate = async (req, _res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next(AppError.unauthorized('Authentication token missing. Please log in.', 'AUTH_TOKEN_MISSING'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(AppError.unauthorized('Authentication token has expired. Please log in again.', 'TOKEN_EXPIRED'));
      }
      return next(AppError.unauthorized('Invalid authentication token.', 'INVALID_TOKEN'));
    }

    // Retrieve active user from database with Author relation if applicable
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { author: true },
    });

    if (!user) {
      return next(AppError.unauthorized('User associated with this token no longer exists.', 'USER_NOT_FOUND'));
    }

    // Attach user context to request object (passwords are excluded)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authorId: user.author ? user.author.id : null,
      authorCode: user.author ? user.author.authorCode : null,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export default authenticate;
