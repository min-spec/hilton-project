const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize, generateToken, blacklistToken } = require('../middleware/auth');
const { validate, schemas, sanitize } = require('../middleware/validation');
const {
  asyncHandler,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  sanitize,
  validate(schemas.register),
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: role || 'guest',
    });

    await user.save();

    // Generate JWT token
    const token = generateToken(user);

    logger.info(`New user registered: ${email} (${user.role})`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        token,
      },
      message: 'Registration successful',
    });
  })
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  sanitize,
  validate(schemas.login),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken(user);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email} (${user.role})`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          lastLogin: user.lastLogin,
        },
        token,
      },
      message: 'Login successful',
    });
  })
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (blacklist token)
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const token = req.token;

    // Blacklist the token
    blacklistToken(token);

    logger.info(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logout successful',
    });
  })
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  })
);

/**
 * @route   PUT /api/auth/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put(
  '/me',
  authenticate,
  sanitize,
  validate(schemas.updateProfile),
  asyncHandler(async (req, res) => {
    const updates = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new NotFoundError('User');
    }

    // Update user fields
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) {
        user[key] = updates[key];
      }
    });

    await user.save();

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          updatedAt: user.updatedAt,
        },
      },
      message: 'Profile updated successfully',
    });
  })
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  authenticate,
  sanitize,
  validate(schemas.changePassword),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new NotFoundError('User');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Check if new password is different
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new ValidationError('New password must be different from current password');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user);

    logger.info(`Password changed for user: ${user.email}`);

    res.json({
      success: true,
      data: {
        token,
      },
      message: 'Password changed successfully',
    });
  })
);

/**
 * @route   GET /api/auth/check-email/:email
 * @desc    Check if email is available
 * @access  Public
 */
router.get(
  '/check-email/:email',
  sanitize,
  asyncHandler(async (req, res) => {
    const { email } = req.params;

    // Basic email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    res.json({
      success: true,
      data: {
        available: !existingUser,
        email,
      },
    });
  })
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get authentication statistics (admin only)
 * @access  Private (Admin only)
 */
router.get(
  '/stats',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const stats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      guests: await User.countDocuments({ role: 'guest' }),
      employees: await User.countDocuments({ role: 'employee' }),
      admins: await User.countDocuments({ role: 'admin' }),
      todayLogins: await User.countDocuments({
        lastLogin: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    };

    res.json({
      success: true,
      data: stats,
    });
  })
);

module.exports = router;
