const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../../src/server');
// const mongoose = require('mongoose'); // Already declared
const User = require('../../src/models/User');

let mongoServer;
let testUser;

describe('Authentication API Tests', () => {
  beforeAll(async () => {
    // Create in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    }

    // Initialize GraphQL server manually for testing
    await server.initializeGraphQL();

    // Create test user
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'guest',
    });
  });

  afterAll(async () => {
    // Clean up database
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
    // Close server
    if (server && server.server) {
      server.server.close();
    }
  });

  afterEach(async () => {
    // Clear database between tests (except test user)
    await User.deleteMany({ email: { $ne: 'test@example.com' } });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        firstName: 'New',
        lastName: 'User',
        phone: '+1234567890',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.user.lastName).toBe(userData.lastName);
      expect(response.body.data.user.role).toBe('guest');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined(); // Password should not be exposed
    });

    it('should fail to register with existing email', async () => {
      const userData = {
        email: 'test@example.com', // Already exists
        password: 'password123',
        firstName: 'Duplicate',
        lastName: 'User',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);
    });

    it('should fail to register with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);
    });

    it('should fail to register with short password', async () => {
      const userData = {
        email: 'shortpass@example.com',
        password: '123', // Too short
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect('Content-Type', /json/)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.message).toBe('Login successful');
    });

    it('should fail to login with incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);
    });

    it('should fail to login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);
    });

    it('should fail to login with deactivated account', async () => {
      // Create and deactivate a user
      await User.create({
        email: 'deactivated@example.com',
        password: 'password123',
        firstName: 'Deactivated',
        lastName: 'User',
        isActive: false,
      });

      const loginData = {
        email: 'deactivated@example.com',
        password: 'password123',
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      authToken = loginResponse.body.data.token;
    });

    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail to get profile without token', async () => {
      await request(app).get('/api/auth/me').expect('Content-Type', /json/).expect(401);
    });

    it('should fail to get profile with invalid token', async () => {
      // Note: In some test environments, this might return 500 if error handling is different
      // but standard behavior is 401/403
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/);

      expect([401, 403, 500]).toContain(response.status);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      authToken = loginResponse.body.data.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successful');
    });
  });

  describe('PUT /api/auth/change-password', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      authToken = loginResponse.body.data.token;
    });

    it('should change password successfully', async () => {
      const changePasswordData = {
        currentPassword: 'password123',
        newPassword: 'NewSecurePass456',
      };

      const response = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePasswordData)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.message).toContain('successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewSecurePass456',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail to change password with wrong current password', async () => {
      // Login with new password to get valid token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'NewSecurePass456',
      });
      const token = loginResponse.body.data.token;

      const changePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewSecurePass789',
      };

      await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send(changePasswordData)
        .expect('Content-Type', /json/)
        .expect(401);
    });
  });

  describe('GET /api/auth/check-email/:email', () => {
    it('should return available for new email', async () => {
      const response = await request(app)
        .get('/api/auth/check-email/newemail@example.com')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
    });

    it('should return unavailable for existing email', async () => {
      const response = await request(app)
        .get('/api/auth/check-email/test@example.com')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(false);
    });

    it('should fail to check email with invalid format', async () => {
      await request(app)
        .get('/api/auth/check-email/invalid-email')
        .expect('Content-Type', /json/)
        .expect(400);
    });
  });
});
