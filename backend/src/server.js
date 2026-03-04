require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ApolloServer } = require('apollo-server-express');

// Configurations
const { connectDB } = require('./config/database');
const logger = require('./config/logger');

// Middleware
const { sanitize } = require('./middleware/validation');
const { createGraphQLContext } = require('./middleware/auth');
const {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  formatGraphQLError,
} = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');

// GraphQL
const typeDefs = require('./schemas/typeDefs');
const resolvers = require('./schemas/resolvers');

// Constants
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

class Server {
  constructor() {
    this.app = express();
    this.port = PORT;
    this.env = NODE_ENV;

    // Set up global error handlers
    this.setupErrorHandlers();

    // Initialize server
    this.initializeMiddlewares();
    this.initializeRoutes();
    // GraphQL initialization is moved to init() method
    // Error handling is also moved to init() method
  }

  async init() {
    await this.initializeGraphQL();
    this.initializeErrorHandling();
  }

  setupErrorHandlers() {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', handleUnhandledRejection);

    // Handle uncaught exceptions
    process.on('uncaughtException', handleUncaughtException);

    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      process.exit(0);
    });
  }

  initializeMiddlewares() {
    // Security headers
    this.app.use(helmet());

    // CORS configuration
    const corsOptions = {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      optionsSuccessStatus: 200,
    };
    this.app.use(cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
      max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // 100 requests per window
      message: 'Too many requests from this IP, please try again later.',
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Input sanitization
    this.app.use(sanitize);

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();

      // Log request
      logger.http({
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });

      // Capture response finish
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.apiLog(req, res, duration);
      });

      next();
    });
  }

  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: this.env,
        uptime: process.uptime(),
      });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);

    // API documentation
    this.app.get('/api/docs', (req, res) => {
      res.json({
        success: true,
        data: {
          endpoints: {
            auth: {
              register: 'POST /api/auth/register',
              login: 'POST /api/auth/login',
              logout: 'POST /api/auth/logout',
              me: 'GET /api/auth/me',
              changePassword: 'PUT /api/auth/change-password',
            },
            graphql: {
              playground: '/graphql',
              endpoint: '/graphql',
            },
          },
          documentation: 'See README.md for detailed API documentation',
        },
      });
    });
  }

  async initializeGraphQL() {
    try {
      // Create Apollo Server instance
      const apolloServer = new ApolloServer({
        typeDefs,
        resolvers,
        context: createGraphQLContext,
        formatError: formatGraphQLError,
        introspection: this.env !== 'production',
        playground: this.env !== 'production',
      });

      // Start Apollo Server
      await apolloServer.start();

      // Apply middleware
      apolloServer.applyMiddleware({
        app: this.app,
        path: '/graphql',
        cors: false,
      });

      logger.info('GraphQL server initialized');
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'initializeGraphQL',
      });
      throw error;
    }
  }

  initializeErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Connect to database
      await connectDB();

      // Initialize async components
      await this.init();

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`🚀 Server running in ${this.env} mode on port ${this.port}`);
        logger.info(`📚 REST API: http://localhost:${this.port}/api`);
        logger.info(`🎮 GraphQL Playground: http://localhost:${this.port}/graphql`);
        logger.info(`🏥 Health check: http://localhost:${this.port}/health`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        logger.errorWithContext(error, {
          operation: 'serverStart',
        });
        process.exit(1);
      });
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'serverStart',
      });
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      this.server.close(() => {
        logger.info('Server stopped');
        process.exit(0);
      });
    }
  }
}

// Create and start server instance
const server = new Server();

// Handle graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal. Closing server...');

  try {
    await server.stop();
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  server.start().catch((error) => {
    logger.errorWithContext(error, {
      operation: 'applicationStart',
    });
    process.exit(1);
  });
}

// Export for testing
module.exports = { app: server.app, server };
