const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    contactPhone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true,
      match: [/^\+?[\d\s\-()]+$/, 'Please enter a valid phone number'],
    },
    expectedArrivalTime: {
      type: Date,
      required: [true, 'Expected arrival time is required'],
      validate: {
        validator: function (value) {
          // Arrival time must be in the future
          return value > new Date();
        },
        message: 'Expected arrival time must be in the future',
      },
    },
    tableSize: {
      type: Number,
      required: [true, 'Table size is required'],
      min: [1, 'Table size must be at least 1'],
      max: [20, 'Table size cannot exceed 20'],
    },
    status: {
      type: String,
      enum: ['Requested', 'Approved', 'Cancelled', 'Completed'],
      default: 'Requested',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    // Reference to user who made the reservation (optional for guest users)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Employee who approved/cancelled/completed the reservation
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Timestamps for status changes
    approvedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual property for formatted arrival time
reservationSchema.virtual('formattedArrivalTime').get(function () {
  return this.expectedArrivalTime.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

// Virtual property for duration since creation
reservationSchema.virtual('durationSinceCreation').get(function () {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
});

// Method to check if reservation can be cancelled (within 24 hours)
reservationSchema.methods.canCancel = function () {
  const now = new Date();
  const arrivalTime = new Date(this.expectedArrivalTime);
  const hoursUntilArrival = (arrivalTime - now) / (1000 * 60 * 60);

  // Can cancel if more than 24 hours before arrival
  return hoursUntilArrival > 24 && this.status === 'Requested';
};

// Method to update status
reservationSchema.methods.updateStatus = async function (newStatus, processedByUserId) {
  const allowedTransitions = {
    Requested: ['Approved', 'Cancelled'],
    Approved: ['Completed', 'Cancelled'],
    Cancelled: [],
    Completed: [],
  };

  if (!allowedTransitions[this.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${this.status} to ${newStatus}`);
  }

  this.status = newStatus;
  this.processedBy = processedByUserId;

  // Set appropriate timestamp
  const timestampField = `${newStatus.toLowerCase()}At`;
  this[timestampField] = new Date();

  return this.save();
};

// Indexes for efficient querying
reservationSchema.index({ expectedArrivalTime: 1 });
reservationSchema.index({ status: 1 });
reservationSchema.index({ contactEmail: 1 });
reservationSchema.index({ guestName: 1 });
reservationSchema.index({ createdAt: -1 });
reservationSchema.index({ userId: 1 });
// Compound indexes for common queries
reservationSchema.index({ status: 1, expectedArrivalTime: 1 });
reservationSchema.index({ contactEmail: 1, expectedArrivalTime: -1 });

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;
