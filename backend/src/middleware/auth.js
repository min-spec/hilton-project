const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Authentication middleware for REST API
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or account is inactive',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Attach user to request
    req.user = user;
    req.token = token;

    logger.info(`User authenticated: ${user.email} (${user.role})`);
    next();
  } catch (error) {
    logger.errorWithContext(error, {
      endpoint: req.originalUrl,
      method: req.method,
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Unauthorized access attempt by ${req.user.email} (${req.user.role}) to ${req.method} ${req.originalUrl}`
      );

      return res.status(403).json({
        success: false,
        error: 'Access denied. Insufficient permissions.',
      });
    }

    next();
  };
};

/**
 * GraphQL authentication context middleware
 * Creates context for GraphQL resolvers
 */
const createGraphQLContext = async ({ req }) => {
  const context = {
    user: null,
    isAuthenticated: false,
    token: null,
  };

  try {
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.userId);

      if (user && user.isActive) {
        context.user = user;
        context.isAuthenticated = true;
        context.token = token;

        // Update last login
        user.lastLogin = new Date();
        await user.save();
      }
    }
  } catch (error) {
    // Don't throw error in context creation, just log it
    logger.errorWithContext(error, {
      operation: 'GraphQL context creation',
    });
  }

  return context;
};

/**
 * GraphQL authorization directive (simplified)
 * Can be used in schema directives for field-level auth
 */
const graphQLAuthDirective = {
  // This would be implemented in the GraphQL schema
  // For now, we provide a utility function
  requireAuth: (context, roles = []) => {
    if (!context.isAuthenticated) {
      throw new Error('Authentication required');
    }

    if (roles.length > 0 && !roles.includes(context.user.role)) {
      throw new Error('Insufficient permissions');
    }

    return true;
  },
};

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Token blacklist (simplified - in production use Redis)
 */
const tokenBlacklist = new Set();

/**
 * Add token to blacklist (logout)
 */
const blacklistToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    const expiry = decoded.exp * 1000; // Convert to milliseconds

    // Add to blacklist
    tokenBlacklist.add(token);

    // Schedule removal after token expires
    setTimeout(() => {
      tokenBlacklist.delete(token);
    }, expiry - Date.now());

    return true;
  } catch (error) {
    logger.error(`Error blacklisting token: ${error.message}`);
    return false;
  }
};

/**
 * Check if token is blacklisted
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

module.exports = {
  authenticate,
  authorize,
  createGraphQLContext,
  graphQLAuthDirective,
  generateToken,
  blacklistToken,
  isTokenBlacklisted,
};
