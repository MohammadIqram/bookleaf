import { sseService } from '../services/sseService.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

/**
 * Server-Sent Events (SSE) stream controller
 * Supports standard Authorization header, cookie, or query param token (for EventSource)
 */
export const streamEvents = async (req, res) => {
  // 1. Resolve user token from query param (standard EventSource workaround) or authenticated req.user
  let user = req.user;

  if (!user && req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, env.JWT_SECRET);
      const dbUser = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { author: true },
      });
      if (dbUser) {
        user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          authorId: dbUser.author ? dbUser.author.id : null,
          authorCode: dbUser.author ? dbUser.author.authorCode : null,
        };
      }
    } catch (err) {
      logger.warn(`[SSE] Token authentication via query param failed: ${err.message}`);
    }
  }

  if (!user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Valid authentication token required to connect to real-time event stream.',
      },
    });
    return;
  }

  // 2. Set headers required for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy response buffering (Nginx)
  });

  res.flushHeaders();

  const clientId = 'sse_' + crypto.randomBytes(8).toString('hex');

  // 3. Register client in SSE service
  sseService.addClient(clientId, user, res);

  // 4. Handle client disconnection
  req.on('close', () => {
    sseService.removeClient(clientId);
  });
};
