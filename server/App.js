// app.js - Express application setup
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Routes
import apiRoutes from './routes/api.routes.js';
import adminRoutes from './routes/admin.routes.js';
import staticRoutes from './routes/static.routes.js';

// Middleware
import { securityMiddleware } from './middleware/security.middleware.js';
import { errorHandler } from './middleware/error-handler.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

const session = require('express-session');

app.use(session({
  secret: 'moonstone-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Apply security middleware to API routes
app.use('/api', securityMiddleware);

// Routes
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', staticRoutes);

// Error handler middleware (should be last)
app.use(errorHandler);

export default app;