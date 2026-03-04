const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate (body, query, params)
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    try {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: property === 'query', // Allow unknown query params
      });

      if (error) {
        const validationErrors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/"/g, ''),
        }));

        logger.warn(`Validation failed: ${JSON.stringify(validationErrors)}`);

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors,
        });
      }

      // Replace validated data
      req[property] = value;
      next();
    } catch (validationError) {
      logger.errorWithContext(validationError, {
        endpoint: req.originalUrl,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: 'Validation error occurred',
      });
    }
  };
};

/**
 * Common validation schemas
 */
const schemas = {
  // User registration
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required',
    }),
    firstName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
    }),
    lastName: Joi.string().min(2).max(50).required().messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
    }),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-()]+$/)
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
      }),
    role: Joi.string().valid('guest', 'employee', 'admin').default('guest'),
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  // Create reservation
  createReservation: Joi.object({
    guestName: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Guest name must be at least 2 characters',
      'string.max': 'Guest name cannot exceed 100 characters',
      'any.required': 'Guest name is required',
    }),
    contactEmail: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Contact email is required',
    }),
    contactPhone: Joi.string()
      .pattern(/^\+?[\d\s\-()]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
        'any.required': 'Contact phone is required',
      }),
    expectedArrivalTime: Joi.date().greater('now').required().messages({
      'date.greater': 'Expected arrival time must be in the future',
      'any.required': 'Expected arrival time is required',
    }),
    tableSize: Joi.number().integer().min(1).max(20).required().messages({
      'number.min': 'Table size must be at least 1',
      'number.max': 'Table size cannot exceed 20',
      'any.required': 'Table size is required',
    }),
    notes: Joi.string().max(500).allow('').messages({
      'string.max': 'Notes cannot exceed 500 characters',
    }),
  }),

  // Update reservation status (for employees)
  updateReservationStatus: Joi.object({
    status: Joi.string().valid('Approved', 'Cancelled', 'Completed').required().messages({
      'any.only': 'Status must be one of: Approved, Cancelled, Completed',
      'any.required': 'Status is required',
    }),
  }),

  // Reservation query parameters
  reservationQuery: Joi.object({
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/)
      .messages({
        'string.pattern.base': 'Date must be in YYYY-MM-DD format',
      }),
    status: Joi.string().valid('Requested', 'Approved', 'Cancelled', 'Completed'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string()
      .valid('expectedArrivalTime', 'createdAt', 'guestName')
      .default('expectedArrivalTime'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  // Update user profile
  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-()]+$/)
      .messages({
        'string.pattern.base': 'Please enter a valid phone number',
      }),
  }),

  // Change password
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'any.required': 'Current password is required',
    }),
    newPassword: Joi.string().min(8).required().messages({
      'string.min': 'New password must be at least 8 characters long',
      'any.required': 'New password is required',
    }),
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid ID format',
        'any.required': 'ID parameter is required',
      }),
  }),
};

/**
 * Sanitize input data to prevent XSS attacks
 */
const sanitizeInput = (data) => {
  if (typeof data === 'string') {
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeInput(item));
  }

  if (data && typeof data === 'object') {
    const sanitized = {};
    for (const key in data) {
      sanitized[key] = sanitizeInput(data[key]);
    }
    return sanitized;
  }

  return data;
};

/**
 * Sanitization middleware
 */
const sanitize = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }

    if (req.query) {
      req.query = sanitizeInput(req.query);
    }

    if (req.params) {
      req.params = sanitizeInput(req.params);
    }

    next();
  } catch (error) {
    logger.errorWithContext(error, {
      operation: 'Input sanitization',
    });
    next();
  }
};

module.exports = {
  validate,
  schemas,
  sanitize,
  sanitizeInput,
};
