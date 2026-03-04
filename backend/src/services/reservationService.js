const Reservation = require('../models/Reservation');
const User = require('../models/User');
const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require('../middleware/errorHandler');
const logger = require('../config/logger');

class ReservationService {
  /**
   * Create a new reservation
   * @param {Object} reservationData - Reservation data
   * @param {string} userId - User ID making the reservation
   * @returns {Promise<Object>} Created reservation
   */
  async createReservation(reservationData, userId) {
    try {
      // Validate arrival time is in the future
      const arrivalTime = new Date(reservationData.expectedArrivalTime);
      if (arrivalTime <= new Date()) {
        throw new ValidationError('Expected arrival time must be in the future');
      }

      // Validate table size
      if (reservationData.tableSize < 1 || reservationData.tableSize > 20) {
        throw new ValidationError('Table size must be between 1 and 20');
      }

      const reservation = new Reservation({
        ...reservationData,
        userId,
        expectedArrivalTime: arrivalTime,
      });

      await reservation.save();

      logger.info(`Reservation created: ${reservation.guestName} (ID: ${reservation._id})`);

      return reservation;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'createReservation',
        userId,
        reservationData,
      });
      throw error;
    }
  }

  /**
   * Get reservation by ID
   * @param {string} reservationId - Reservation ID
   * @param {string} userId - User ID requesting the reservation
   * @param {string} userRole - User role for authorization
   * @returns {Promise<Object>} Reservation data
   */
  async getReservationById(reservationId, userId, userRole) {
    try {
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // Authorization check
      if (userRole === 'guest' && reservation.userId?.toString() !== userId) {
        throw new AuthorizationError('You can only view your own reservations');
      }

      return reservation;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'getReservationById',
        reservationId,
        userId,
        userRole,
      });
      throw error;
    }
  }

  /**
   * Get user's reservations
   * @param {string} userId - User ID
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Paginated reservations
   */
  async getUserReservations(userId, filter = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'expectedArrivalTime', sortOrder = 'asc' } = options;

      // Build query
      const query = { userId };

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
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute queries in parallel
      const [reservations, totalCount] = await Promise.all([
        Reservation.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Reservation.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        reservations,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'getUserReservations',
        userId,
        filter,
        options,
      });
      throw error;
    }
  }

  /**
   * Get all reservations (for employees/admins)
   * @param {Object} filter - Filter criteria
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} Paginated reservations
   */
  async getAllReservations(filter = {}, options = {}) {
    try {
      const { page = 1, limit = 20, sortBy = 'expectedArrivalTime', sortOrder = 'asc' } = options;

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
        query.tableSize = { $gte: filter.minTableSize };
      }

      if (filter.maxTableSize !== undefined) {
        query.tableSize = { $lte: filter.maxTableSize };
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
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute queries in parallel
      const [reservations, totalCount] = await Promise.all([
        Reservation.find(query).sort(sort).skip(skip).limit(limit).lean(),
        Reservation.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        reservations,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'getAllReservations',
        filter,
        options,
      });
      throw error;
    }
  }

  /**
   * Update reservation (for guests)
   * @param {string} reservationId - Reservation ID
   * @param {Object} updateData - Data to update
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated reservation
   */
  async updateUserReservation(reservationId, updateData, userId) {
    try {
      const reservation = await Reservation.findOne({
        _id: reservationId,
        userId,
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
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          reservation[key] =
            key === 'expectedArrivalTime' ? new Date(updateData[key]) : updateData[key];
        }
      });

      await reservation.save();

      logger.info(`Reservation updated by user: ${reservation.guestName} (ID: ${reservation._id})`);

      return reservation;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'updateUserReservation',
        reservationId,
        userId,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Cancel reservation (for guests)
   * @param {string} reservationId - Reservation ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cancelled reservation
   */
  async cancelUserReservation(reservationId, userId) {
    try {
      const reservation = await Reservation.findOne({
        _id: reservationId,
        userId,
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

      await reservation.updateStatus('Cancelled', userId);

      logger.info(
        `Reservation cancelled by user: ${reservation.guestName} (ID: ${reservation._id})`
      );

      return reservation;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'cancelUserReservation',
        reservationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Update reservation status (for employees/admins)
   * @param {string} reservationId - Reservation ID
   * @param {string} status - New status
   * @param {string} employeeId - Employee/Admin ID
   * @returns {Promise<Object>} Updated reservation
   */
  async updateReservationStatus(reservationId, status, employeeId) {
    try {
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      await reservation.updateStatus(status, employeeId);

      logger.info(
        `Reservation status updated: ${reservation.guestName} to ${status} by employee ${employeeId}`
      );

      return reservation;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'updateReservationStatus',
        reservationId,
        status,
        employeeId,
      });
      throw error;
    }
  }

  /**
   * Update reservation details (for employees/admins)
   * @param {string} reservationId - Reservation ID
   * @param {Object} updateData - Data to update
   * @param {string} employeeId - Employee/Admin ID
   * @returns {Promise<Object>} Updated reservation
   */
  async updateReservation(reservationId, updateData, employeeId) {
    try {
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // Update fields
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] !== undefined) {
          reservation[key] =
            key === 'expectedArrivalTime' ? new Date(updateData[key]) : updateData[key];
        }
      });

      await reservation.save();

      logger.info(
        `Reservation updated by employee: ${reservation.guestName} (ID: ${reservation._id})`
      );

      return reservation;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'updateReservation',
        reservationId,
        employeeId,
        updateData,
      });
      throw error;
    }
  }

  /**
   * Get reservation statistics
   * @returns {Promise<Object>} Reservation statistics
   */
  async getReservationStats() {
    try {
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
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'getReservationStats',
      });
      throw error;
    }
  }

  /**
   * Search reservations
   * @param {string} searchQuery - Search query
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Search results
   */
  async searchReservations(searchQuery, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
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
        Reservation.find(query).sort({ expectedArrivalTime: 1 }).skip(skip).limit(limit).lean(),
        Reservation.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      return {
        reservations,
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'searchReservations',
        searchQuery,
        options,
      });
      throw error;
    }
  }

  /**
   * Delete reservation (admin only)
   * @param {string} reservationId - Reservation ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteReservation(reservationId) {
    try {
      const reservation = await Reservation.findById(reservationId);

      if (!reservation) {
        throw new NotFoundError('Reservation');
      }

      // Only allow deletion of cancelled or completed reservations
      if (!['Cancelled', 'Completed'].includes(reservation.status)) {
        throw new ValidationError('Only cancelled or completed reservations can be deleted');
      }

      await reservation.deleteOne();

      logger.info(`Reservation deleted: ${reservation.guestName} (ID: ${reservation._id})`);

      return true;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'deleteReservation',
        reservationId,
      });
      throw error;
    }
  }

  /**
   * Bulk update reservation statuses
   * @param {string[]} reservationIds - Array of reservation IDs
   * @param {string} status - New status
   * @param {string} employeeId - Employee/Admin ID
   * @returns {Promise<Object[]>} Updated reservations
   */
  async bulkUpdateReservations(reservationIds, status, employeeId) {
    try {
      const reservations = await Reservation.find({ _id: { $in: reservationIds } });

      if (reservations.length !== reservationIds.length) {
        throw new NotFoundError('Some reservations not found');
      }

      const updatedReservations = await Promise.all(
        reservations.map((reservation) => reservation.updateStatus(status, employeeId))
      );

      logger.info(`Bulk updated ${updatedReservations.length} reservations to ${status}`);

      return updatedReservations;
    } catch (error) {
      logger.errorWithContext(error, {
        operation: 'bulkUpdateReservations',
        reservationIds,
        status,
        employeeId,
      });
      throw error;
    }
  }
}

module.exports = new ReservationService();
