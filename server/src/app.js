import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { env } from './config/env.js';
import logger from './utils/logger.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimiters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust reverse proxy headers (e.g. Nginx, Cloudflare)
app.set('trust proxy', 1);

// Security Headers (allow Swagger UI inline scripts/styles)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration supporting credentials (cookies/auth headers)
const allowedOrigins = [
  env.CORS_ORIGIN,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request tracing and logging
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || logger.generateRequestId();
  res.setHeader('X-Request-Id', req.id);

  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Don't clutter logs with SSE keepalives
    if (req.originalUrl !== '/api/v1/events') {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: duration,
        ip: req.ip,
      });
    }
  });

  next();
});

// Apply rate limiter to API routes (bypassing test runs)
if (env.NODE_ENV !== 'test') {
  app.use('/api', generalLimiter);
}

// Swagger UI Documentation
try {
  const openApiCandidates = [
    path.resolve(__dirname, '../openapi.yaml'),
    path.resolve(__dirname, '../../openapi.yaml'),
    path.resolve(process.cwd(), 'openapi.yaml'),
  ];
  const openApiPath = openApiCandidates.find((p) => fs.existsSync(p));
  if (openApiPath) {
    const swaggerDoc = YAML.load(openApiPath);
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    logger.info(`📖 OpenAPI Docs mounted at /api/docs (loaded from ${openApiPath})`);
  }
} catch (err) {
  logger.warn('Could not initialize Swagger UI documentation:', { error: err.message });
}

// Direct Health Check Route
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    service: 'BookLeaf Support API v1',
  });
});

// Mount Main API Routes
app.use('/api/v1', apiRoutes);

// Catch Unmatched Endpoints (404)
app.use(notFound);

// Centralized Error Handling
app.use(errorHandler);

export default app;
