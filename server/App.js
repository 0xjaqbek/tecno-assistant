// app.js - Express application setup
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session'; 
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

// Session setup
app.use(session({
  secret: 'moonstone-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Configure CORS to allow requests from your GitHub Pages domain
  const corsOptions = {
    origin: [
      'https://0xjaqbek.github.io',
      'https://0xjaqbek.github.io/tecnosoluciones/',
      'https://0xjaqbek.github.io/tecnosoluciones',
      'https://7b868258933b.ngrok-free.app',   // Update to your current ngrok URL
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:4173'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'], // Add this header
    credentials: true
  };

// Apply CORS middleware with options
app.use(cors(corsOptions));


// Middleware setup

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
