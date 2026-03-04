const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { generateToken, graphQLAuthDirective } = require('../middleware/auth');
const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  AppError,
} = require('../middleware/errorHandler');
const logger = require('../config/logger');

// Custom scalar resolvers
const DateTime = {
  __parseValue(value) {
    return new Date(value); // Convert incoming string to Date
  },
  __serialize(value) {
    return value.toISOString(); // Convert outgoing Date to ISO string
  },
  __parseLiteral(ast) {
    if (ast.kind === 'StringValue') {
      return new Date(ast.value);
    }
    return null;
  },
};

const resolvers = {
  // Custom scalars
  DateTime,
  JSON: {
    __serialize(value) {
      return value;
    },
  },

  // Type resolvers
  User: {
    // Additional field resolvers if needed
  },

  Reservation: {
    // Virtual fields
    formattedArrivalTime: (parent) => parent.formattedArrivalTime,
    durationSinceCreation: (parent) => parent.durationSinceCreation,
    canCancel: (parent) => parent.canCancel(),

    // Relationship resolvers
    user: async (parent) => {
      if (!parent.userId) return null;
      return User.findById(parent.userId);
    },
    processedByUser: async (parent) => {
      if (!parent.processedBy) return null;
      return User.findById(parent.processedBy);
    },
  },

  // Query resolvers
  Query: {
    // Get current user
    me: async (parent, args, context) => {
      graphQLAuthDirective.requireAuth(context);
      return context.user;
    },

    // Get all reservations (for employees/admins)
    reservations: async (parent, { filter = {}, sort = {}, pagination = {} }, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const { page = 1, limit = 20 } = pagination;
      const { field = 'expectedArrivalTime', order = 'asc' } = sort;

      // Build query
      const query = {};

      // Apply filters
      if (filter.date) {
        const date = new Date(filter.date);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        query.expectedArrivalTime = {
          $gte: date,
          $lt: nextDay,
        };
      }

      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.guestName) {
        query.guestName = { $regex: filter.guestName, $options: 'i' };
      }

      if (filter.contactEmail) {
        query.contactEmail = { $regex: filter.contactEmail, $options: 'i' };
      }

      if (filter.minTableSize !== undefined) {
        query.tableSize = { ...query.tableSize, $gte: filter.minTableSize };
      }

      if (filter.maxTableSize !== undefined) {
        query.tableSize = { ...query.tableSize, $lte: filter.maxTableSize };
      }

      if (filter.startDate) {
        query.expectedArrivalTime = {
          ...query.expectedArrivalTime,
          $gte: new Date(filter.startDate),
        };
      }

      if (filter.endDate) {
        query.expectedArrivalTime = {
          ...query.expectedArrivalTime,
          $lte: new Date(filter.endDate),
        };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortObj = { [field]: sortOrder };

      // Execute queries
      const [reservations, totalCount] = await Promise.all([
        Reservation.find(query).sort(sortObj).skip(skip).limit(limit),
        Reservation.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        reservations,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },

    // Get single reservation
    reservation: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context);

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // Check permissions
      if (
        context.user.role === 'guest' &&
        reservation.userId?.toString() !== context.user._id.toString()
      ) {
        throw new AuthorizationError('You can only view your own reservations');
      }

      return reservation;
    },

    // Get user's own reservations
    myReservations: async (parent, { filter = {}, sort = {}, pagination = {} }, context) => {
      graphQLAuthDirective.requireAuth(context);

      const { page = 1, limit = 20 } = pagination;
      const { field = 'expectedArrivalTime', order = 'asc' } = sort;

      // Build query for user's reservations
      const query = { userId: context.user._id };

      // Apply filters
      if (filter.status) {
        query.status = filter.status;
      }

      if (filter.startDate) {
        query.expectedArrivalTime = {
          ...query.expectedArrivalTime,
          $gte: new Date(filter.startDate),
        };
      }

      if (filter.endDate) {
        query.expectedArrivalTime = {
          ...query.expectedArrivalTime,
          $lte: new Date(filter.endDate),
        };
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sortOrder = order === 'desc' ? -1 : 1;
      const sortObj = { [field]: sortOrder };

      // Execute queries
      const [reservations, totalCount] = await Promise.all([
        Reservation.find(query).sort(sortObj).skip(skip).limit(limit),
        Reservation.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        reservations,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },

    // Get reservation statistics
    reservationStats: async (parent, args, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await Promise.all([
        Reservation.countDocuments(),
        Reservation.countDocuments({ status: 'Requested' }),
        Reservation.countDocuments({ status: 'Approved' }),
        Reservation.countDocuments({ status: 'Cancelled' }),
        Reservation.countDocuments({ status: 'Completed' }),
        Reservation.countDocuments({
          expectedArrivalTime: {
            $gte: today,
            $lt: tomorrow,
          },
        }),
        Reservation.countDocuments({
          expectedArrivalTime: { $gte: new Date() },
          status: { $in: ['Requested', 'Approved'] },
        }),
      ]);

      return {
        total: stats[0],
        requested: stats[1],
        approved: stats[2],
        cancelled: stats[3],
        completed: stats[4],
        today: stats[5],
        upcoming: stats[6],
      };
    },

    // Admin: Get all users
    allUsers: async (parent, { role, isActive, pagination = {} }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const { page = 1, limit = 20 } = pagination;
      const query = {};

      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive;

      const skip = (page - 1) * limit;

      return User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
    },

    // Admin: Get single user
    user: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const user = await User.findById(id).select('-password');
      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    },

    // Search reservations
    searchReservations: async (parent, { query: searchQuery, pagination = {} }, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const query = {
        $or: [
          { guestName: { $regex: searchQuery, $options: 'i' } },
          { contactEmail: { $regex: searchQuery, $options: 'i' } },
          { contactPhone: { $regex: searchQuery, $options: 'i' } },
          { notes: { $regex: searchQuery, $options: 'i' } },
        ],
      };

      const [reservations, totalCount] = await Promise.all([
        Reservation.find(query).sort({ expectedArrivalTime: 1 }).skip(skip).limit(limit),
        Reservation.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        reservations,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    },

    // Health check
    health: () => ({
      success: true,
      message: 'GraphQL API is healthy',
      data: { timestamp: new Date().toISOString() },
    }),
  },

  // Mutation resolvers
  Mutation: {
    // Authentication mutations
    register: async (parent, { input }) => {
      const { email, password, firstName, lastName, phone, role = 'guest' } = input;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
      });

      await user.save();

      // Generate token
      const token = generateToken(user);

      logger.info(`New user registered via GraphQL: ${email} (${role})`);

      return {
        user,
        token,
      };
    },

    login: async (parent, { input }) => {
      const { email, password } = input;

      const user = await User.findOne({ email });
      if (!user || !user.isActive) {
        throw new AuthenticationError('Invalid email or password');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AuthenticationError('Invalid email or password');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user);

      logger.info(`User logged in via GraphQL: ${email} (${user.role})`);

      return {
        user,
        token,
      };
    },

    logout: async (parent, args, context) => {
      graphQLAuthDirective.requireAuth(context);

      // Note: Token blacklisting would be handled at the REST API level
      // GraphQL doesn't have built-in session management

      return {
        success: true,
        message: 'Logged out successfully',
      };
    },

    updateProfile: async (parent, { firstName, lastName, phone }, context) => {
      graphQLAuthDirective.requireAuth(context);

      const updates = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;

      const user = await User.findByIdAndUpdate(context.user._id, updates, {
        new: true,
        runValidators: true,
      }).select('-password');

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    },

    changePassword: async (parent, { currentPassword, newPassword }, context) => {
      graphQLAuthDirective.requireAuth(context);

      const user = await User.findById(context.user._id);
      if (!user) {
        throw new NotFoundError('User');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new AuthenticationError('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully',
      };
    },

    // Reservation mutations (Guest)
    createReservation: async (parent, { input }, context) => {
      graphQLAuthDirective.requireAuth(context, ['guest']);

      const reservation = new Reservation({
        ...input,
        userId: context.user._id,
        expectedArrivalTime: new Date(input.expectedArrivalTime),
      });

      await reservation.save();

      logger.info(`Reservation created: ${reservation.guestName} by ${context.user.email}`);

      return reservation;
    },

    updateMyReservation: async (parent, { id, input }, context) => {
      graphQLAuthDirective.requireAuth(context, ['guest']);

      const reservation = await Reservation.findOne({
        _id: id,
        userId: context.user._id,
        status: 'Requested', // Can only update requested reservations
      });

      if (!reservation) {
        throw new NotFoundError('Reservation or you cannot update this reservation');
      }

      // Check if reservation can be updated (more than 24 hours before arrival)
      if (!reservation.canCancel()) {
        throw new ValidationError('Reservation cannot be updated within 24 hours of arrival');
      }

      // Update fields
      Object.keys(input).forEach((key) => {
        if (input[key] !== undefined) {
          reservation[key] = key === 'expectedArrivalTime' ? new Date(input[key]) : input[key];
        }
      });

      await reservation.save();

      return reservation;
    },

    cancelMyReservation: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context, ['guest']);

      const reservation = await Reservation.findOne({
        _id: id,
        userId: context.user._id,
        status: { $in: ['Requested', 'Approved'] },
      });

      if (!reservation) {
        throw new NotFoundError('Reservation or you cannot cancel this reservation');
      }

      // Check if reservation can be cancelled
      if (reservation.status === 'Approved' && !reservation.canCancel()) {
        throw new ValidationError(
          'Approved reservations cannot be cancelled within 24 hours of arrival'
        );
      }

      await reservation.updateStatus('Cancelled', context.user._id);

      logger.info(`Reservation cancelled: ${reservation.guestName} by ${context.user.email}`);

      return reservation;
    },

    // Reservation mutations (Employee/Admin)
    updateReservationStatus: async (parent, { id, status }, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      await reservation.updateStatus(status, context.user._id);

      logger.info(
        `Reservation status updated: ${reservation.guestName} to ${status} by ${context.user.email}`
      );

      return reservation;
    },

    updateReservation: async (parent, { id, input }, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // Update fields
      Object.keys(input).forEach((key) => {
        if (input[key] !== undefined) {
          reservation[key] = key === 'expectedArrivalTime' ? new Date(input[key]) : input[key];
        }
      });

      await reservation.save();

      return reservation;
    },

    deleteReservation: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // Only allow deletion of cancelled or completed reservations
      if (!['Cancelled', 'Completed'].includes(reservation.status)) {
        throw new ValidationError('Only cancelled or completed reservations can be deleted');
      }

      await reservation.deleteOne();

      return {
        success: true,
        message: 'Reservation deleted successfully',
      };
    },

    // User management mutations (Admin)
    createUser: async (parent, { input }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const { email, password, firstName, lastName, phone, role = 'guest' } = input;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      const user = new User({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
      });

      await user.save();

      return user;
    },

    updateUser: async (parent, { id, input }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const user = await User.findByIdAndUpdate(id, input, {
        new: true,
        runValidators: true,
      }).select('-password');

      if (!user) {
        throw new NotFoundError('User');
      }

      return user;
    },

    deactivateUser: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true });

      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        success: true,
        message: 'User deactivated successfully',
      };
    },

    activateUser: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context, ['admin']);

      const user = await User.findByIdAndUpdate(id, { isActive: true }, { new: true });

      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        success: true,
        message: 'User activated successfully',
      };
    },

    // System mutations
    sendReservationReminder: async (parent, { id }, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const reservation = await Reservation.findById(id);
      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // In a real implementation, this would send an email/SMS
      logger.info(`Reservation reminder sent for: ${reservation.guestName}`);

      return {
        success: true,
        message: 'Reminder sent successfully',
      };
    },

    bulkUpdateReservations: async (parent, { ids, status }, context) => {
      graphQLAuthDirective.requireAuth(context, ['employee', 'admin']);

      const reservations = await Reservation.find({ _id: { $in: ids } });

      if (reservations.length !== ids.length) {
        throw new NotFoundError('Some reservations not found');
      }

      const updatedReservations = await Promise.all(
        reservations.map((reservation) => reservation.updateStatus(status, context.user._id))
      );

      logger.info(`Bulk updated ${updatedReservations.length} reservations to ${status}`);

      return updatedReservations;
    },
  },

  // Subscription resolvers (placeholder - would need PubSub implementation)
  Subscription: {
    reservationCreated: {
      subscribe: () => {
        throw new AppError('Subscriptions not implemented');
      },
    },
    reservationUpdated: {
      subscribe: () => {
        throw new AppError('Subscriptions not implemented');
      },
    },
    reservationStatusChanged: {
      subscribe: () => {
        throw new AppError('Subscriptions not implemented');
      },
    },
    newReservationNotification: {
      subscribe: () => {
        throw new AppError('Subscriptions not implemented');
      },
    },
    reservationReminder: {
      subscribe: () => {
        throw new AppError('Subscriptions not implemented');
      },
    },
    systemAlert: {
      subscribe: () => {
        throw new AppError('Subscriptions not implemented');
      },
    },
  },
};

module.exports = resolvers;
