const mongoose = require('mongoose');
const logger = require('./logger');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connectDB = async () => {
  try {
    let uri = process.env.MONGODB_URI;

    if (!uri || process.env.USE_IN_MEMORY_DB === 'true') {
      logger.info('Starting in-memory MongoDB server...');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      logger.info(`In-memory MongoDB URI: ${uri}`);
    } else if (!uri) {
      // Default fallback if neither env var is set properly, though unlikely with correct setup
      logger.warn('MONGODB_URI not set. Falling back to in-memory database.');
      logger.info('Starting in-memory MongoDB server...');
      mongoServer = await MongoMemoryServer.create();
      uri = mongoServer.getUri();
      logger.info(`In-memory MongoDB URI: ${uri}`);
    }

    const conn = await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    if (mongoServer) {
      await mongoServer.stop();
    }
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
  }
};

const checkDBHealth = async () => {
  try {
    // Run a simple command to check connection
    await mongoose.connection.db.admin().ping();
    return {
      status: 'healthy',
      message: 'Database connection is active',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database connection error: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  checkDBHealth,
};
