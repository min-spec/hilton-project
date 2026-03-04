const logger = require('../config/logger');

/**
 * Custom error classes for better error handling
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400);
    this.details = details;
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  // Set default values
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  logError(err, req);

  // Development vs production error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

/**
 * Log error with context
 */
const logError = (err, req) => {
  const errorContext = {
    name: err.name,
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    isOperational: err.isOperational,
    endpoint: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user ? req.user.id : 'anonymous',
    timestamp: new Date().toISOString(),
  };

  if (err.statusCode >= 500) {
    logger.errorWithContext(err, errorContext);
  } else if (err.statusCode >= 400) {
    logger.warn(JSON.stringify(errorContext));
  }
};

/**
 * Send detailed error response in development
 */
const sendErrorDev = (err, res) => {
  const response = {
    success: false,
    error: {
      message: err.message,
      status: err.status,
      statusCode: err.statusCode,
      stack: err.stack,
      name: err.name,
    },
  };

  // Add validation details if available
  if (err.details) {
    response.error.details = err.details;
  }

  res.status(err.statusCode).json(response);
};

/**
 * Send sanitized error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response = {
      success: false,
      error: {
        message: err.message,
        status: err.status,
      },
    };

    // Add validation details if available
    if (err.details && Array.isArray(err.details)) {
      response.error.details = err.details;
    }

    res.status(err.statusCode).json(response);
  }
  // Programming or unknown error: don't leak error details
  else {
    // Log the error for debugging
    logger.error('UNEXPECTED ERROR:', err);

    // Generic error message
    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong',
        status: 'error',
      },
    });
  }
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Cannot find ${req.originalUrl} on this server`, 404);
  next(err);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (reason, promise) => {
  logger.error('UNHANDLED REJECTION:', {
    reason: reason.message || reason,
    stack: reason.stack,
    promise,
  });

  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (error) => {
  logger.error('UNCAUGHT EXCEPTION:', {
    message: error.message,
    stack: error.stack,
  });

  // In production, you might want to restart the process
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
};

/**
 * Async error wrapper for Express routes
 * Eliminates the need for try-catch blocks in route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GraphQL error formatter
 */
const formatGraphQLError = (error) => {
  const originalError = error.originalError;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log the error
  const errorContext = {
    message: error.message,
    locations: error.locations,
    path: error.path,
    stack: originalError ? originalError.stack : error.stack,
  };
  
  // Only log detailed errors if they are not operational or if in development
  if (isDevelopment || !(originalError instanceof AppError && originalError.isOperational)) {
    logger.errorWithContext(originalError || error, {
      operation: 'GraphQL',
      ...errorContext
    });
  }

  // If it's one of our custom errors
  if (originalError instanceof AppError) {
    return {
      message: originalError.message,
      statusCode: originalError.statusCode,
      details: originalError.details,
      locations: error.locations,
      path: error.path,
    };
  }

  // For GraphQL validation errors
  if (error.message.startsWith('Variable')) {
    return {
      message: 'Validation error',
      statusCode: 400,
      details: [{ message: error.message }],
      locations: error.locations,
      path: error.path,
    };
  }

  // Default error formatting
  return {
    message: isDevelopment ? error.message : 'Internal server error',
    statusCode: 500,
    locations: error.locations,
    path: error.path,
  };
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  errorHandler,
  notFoundHandler,
  handleUnhandledRejection,
  handleUncaughtException,
  asyncHandler,
  formatGraphQLError,
};
