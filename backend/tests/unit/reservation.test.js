const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app, server } = require('../../src/server');
// const mongoose = require('mongoose'); // Already declared
const User = require('../../src/models/User');
const Reservation = require('../../src/models/Reservation');

let mongoServer;
let guestUser, employeeUser, adminUser;
let guestToken, employeeToken, adminToken;

describe('Reservation API Tests', () => {
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

    // Create test users with different roles
    guestUser = await User.create({
      email: 'guest@example.com',
      password: 'password123',
      firstName: 'Guest',
      lastName: 'User',
      role: 'guest',
    });
    guestToken = guestUser.getSignedJwtToken();

    employeeUser = await User.create({
      email: 'employee@example.com',
      password: 'password123',
      firstName: 'Employee',
      lastName: 'User',
      role: 'employee',
    });
    employeeToken = employeeUser.getSignedJwtToken();

    adminUser = await User.create({
      email: 'admin@example.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    });
    adminToken = adminUser.getSignedJwtToken();
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
    // Clear reservations between tests
    await Reservation.deleteMany({});
  });

  describe('Reservation Creation', () => {
    it('should create a reservation successfully (GraphQL)', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0); // 7:00 PM tomorrow

      const createReservationMutation = {
        query: `
          mutation CreateReservation($input: CreateReservationInput!) {
            createReservation(input: $input) {
              id
              guestName
              contactEmail
              contactPhone
              expectedArrivalTime
              tableSize
              status
            }
          }
        `,
        variables: {
          input: {
            guestName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '+1234567890',
            expectedArrivalTime: tomorrow.toISOString(),
            tableSize: 4,
            notes: 'Window seat preferred',
          },
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(createReservationMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.createReservation).toBeDefined();
      expect(response.body.data.createReservation.guestName).toBe('John Doe');
      expect(response.body.data.createReservation.contactEmail).toBe('john@example.com');
      expect(response.body.data.createReservation.tableSize).toBe(4);
      expect(response.body.data.createReservation.status).toBe('Requested');
    });

    it('should fail to create reservation without authentication', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const createReservationMutation = {
        query: `
          mutation CreateReservation($input: CreateReservationInput!) {
            createReservation(input: $input) {
              id
              guestName
            }
          }
        `,
        variables: {
          input: {
            guestName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '+1234567890',
            expectedArrivalTime: tomorrow.toISOString(),
            tableSize: 4,
          },
        },
      };

      const response = await request(app)
        .post('/graphql')
        .send(createReservationMutation)
        .expect('Content-Type', /json/)
        .expect(200); // GraphQL returns 200 even for errors

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Authentication');
    });

    it('should fail to create reservation with past date', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const createReservationMutation = {
        query: `
          mutation CreateReservation($input: CreateReservationInput!) {
            createReservation(input: $input) {
              id
              guestName
            }
          }
        `,
        variables: {
          input: {
            guestName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '+1234567890',
            expectedArrivalTime: yesterday.toISOString(),
            tableSize: 4,
          },
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(createReservationMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('future');
    });

    it('should fail to create reservation with invalid table size', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const createReservationMutation = {
        query: `
          mutation CreateReservation($input: CreateReservationInput!) {
            createReservation(input: $input) {
              id
              guestName
            }
          }
        `,
        variables: {
          input: {
            guestName: 'John Doe',
            contactEmail: 'john@example.com',
            contactPhone: '+1234567890',
            expectedArrivalTime: tomorrow.toISOString(),
            tableSize: 0, // Invalid: less than 1
          },
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(createReservationMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Reservation Retrieval', () => {
    let testReservation;

    beforeEach(async () => {
      // Create a test reservation
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);

      testReservation = await Reservation.create({
        guestName: 'Test Guest',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
        expectedArrivalTime: tomorrow,
        tableSize: 2,
        status: 'Requested',
        userId: guestUser._id,
      });
    });

    it('should get reservation by ID (GraphQL)', async () => {
      const getReservationQuery = {
        query: `
          query GetReservation($id: ID!) {
            reservation(id: $id) {
              id
              guestName
              contactEmail
              contactPhone
              tableSize
              status
            }
          }
        `,
        variables: {
          id: testReservation._id.toString(),
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(getReservationQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.reservation).toBeDefined();
      expect(response.body.data.reservation.id).toBe(testReservation._id.toString());
      expect(response.body.data.reservation.guestName).toBe('Test Guest');
    });

    it('should get user reservations (GraphQL)', async () => {
      const getMyReservationsQuery = {
        query: `
          query GetMyReservations {
            myReservations {
              reservations {
                id
                guestName
                status
              }
              totalCount
              currentPage
            }
          }
        `,
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(getMyReservationsQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.myReservations).toBeDefined();
      expect(response.body.data.myReservations.reservations).toHaveLength(1);
      expect(response.body.data.myReservations.totalCount).toBe(1);
    });

    it('should get all reservations as employee (GraphQL)', async () => {
      const getAllReservationsQuery = {
        query: `
          query GetAllReservations {
            reservations {
              reservations {
                id
                guestName
                status
              }
              totalCount
            }
          }
        `,
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(getAllReservationsQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.reservations).toBeDefined();
      expect(response.body.data.reservations.reservations).toHaveLength(1);
    });

    it('should fail to get all reservations as guest', async () => {
      const getAllReservationsQuery = {
        query: `
          query GetAllReservations {
            reservations {
              reservations {
                id
                guestName
              }
            }
          }
        `,
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(getAllReservationsQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('permissions');
    });
  });

  describe('Reservation Updates', () => {
    let testReservation;

    beforeEach(async () => {
      // Create a test reservation far in the future (so it can be updated)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3); // 3 days from now
      futureDate.setHours(19, 0, 0, 0);

      testReservation = await Reservation.create({
        guestName: 'Update Test',
        contactEmail: 'update@example.com',
        contactPhone: '+1234567890',
        expectedArrivalTime: futureDate,
        tableSize: 2,
        status: 'Requested',
        userId: guestUser._id,
      });
    });

    it('should update reservation as guest (GraphQL)', async () => {
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 4);
      newDate.setHours(20, 0, 0, 0);

      const updateReservationMutation = {
        query: `
          mutation UpdateMyReservation($id: ID!, $input: UpdateReservationInput!) {
            updateMyReservation(id: $id, input: $input) {
              id
              guestName
              tableSize
              expectedArrivalTime
            }
          }
        `,
        variables: {
          id: testReservation._id.toString(),
          input: {
            tableSize: 4,
            expectedArrivalTime: newDate.toISOString(),
            notes: 'Updated notes',
          },
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(updateReservationMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.updateMyReservation).toBeDefined();
      expect(response.body.data.updateMyReservation.tableSize).toBe(4);
    });

    it('should cancel reservation as guest (GraphQL)', async () => {
      const cancelReservationMutation = {
        query: `
          mutation CancelMyReservation($id: ID!) {
            cancelMyReservation(id: $id) {
              id
              status
            }
          }
        `,
        variables: {
          id: testReservation._id.toString(),
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(cancelReservationMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.cancelMyReservation).toBeDefined();
      expect(response.body.data.cancelMyReservation.status).toBe('Cancelled');
    });

    it('should update reservation status as employee (GraphQL)', async () => {
      const updateStatusMutation = {
        query: `
          mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!) {
            updateReservationStatus(id: $id, status: $status) {
              id
              status
            }
          }
        `,
        variables: {
          id: testReservation._id.toString(),
          status: 'Approved',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(updateStatusMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.updateReservationStatus).toBeDefined();
      expect(response.body.data.updateReservationStatus.status).toBe('Approved');
    });

    it('should fail to update status as guest', async () => {
      const updateStatusMutation = {
        query: `
          mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!) {
            updateReservationStatus(id: $id, status: $status) {
              id
              status
            }
          }
        `,
        variables: {
          id: testReservation._id.toString(),
          status: 'Approved',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(updateStatusMutation)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('permissions');
    });
  });

  describe('Reservation Statistics', () => {
    beforeEach(async () => {
      // Create multiple reservations with different statuses
      const today = new Date();
      // Ensure time is in the future for "today"
      today.setHours(today.getHours() + 1);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Reservation.create([
        {
          guestName: 'Stat 1',
          contactEmail: 'stat1@example.com',
          contactPhone: '+1111111111',
          expectedArrivalTime: today,
          tableSize: 2,
          status: 'Requested',
        },
        {
          guestName: 'Stat 2',
          contactEmail: 'stat2@example.com',
          contactPhone: '+2222222222',
          expectedArrivalTime: tomorrow,
          tableSize: 4,
          status: 'Approved',
        },
        {
          guestName: 'Stat 3',
          contactEmail: 'stat3@example.com',
          contactPhone: '+3333333333',
          expectedArrivalTime: today,
          tableSize: 6,
          status: 'Cancelled',
        },
      ]);
    });

    it('should get reservation statistics as employee (GraphQL)', async () => {
      const getStatsQuery = {
        query: `
          query GetReservationStats {
            reservationStats {
              total
              requested
              approved
              cancelled
              completed
              today
              upcoming
            }
          }
        `,
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(getStatsQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.reservationStats).toBeDefined();
      expect(response.body.data.reservationStats.total).toBe(3);
      expect(response.body.data.reservationStats.requested).toBe(1);
      expect(response.body.data.reservationStats.approved).toBe(1);
      expect(response.body.data.reservationStats.cancelled).toBe(1);
    });

    it('should fail to get statistics as guest', async () => {
      const getStatsQuery = {
        query: `
          query GetReservationStats {
            reservationStats {
              total
            }
          }
        `,
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${guestToken}`)
        .send(getStatsQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('Reservation Search', () => {
    beforeEach(async () => {
      const today = new Date();
      today.setHours(today.getHours() + 1);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Create reservations for search testing
      await Reservation.create([
        {
          guestName: 'John Smith',
          contactEmail: 'john.smith@example.com',
          contactPhone: '+1111111111',
          expectedArrivalTime: today,
          tableSize: 2,
          status: 'Requested',
          notes: 'Birthday celebration',
        },
        {
          guestName: 'Jane Doe',
          contactEmail: 'jane.doe@example.com',
          contactPhone: '+2222222222',
          expectedArrivalTime: tomorrow,
          tableSize: 4,
          status: 'Approved',
          notes: 'Business dinner',
        },
      ]);
    });

    it('should search reservations by name (GraphQL)', async () => {
      const searchQuery = {
        query: `
          query SearchReservations($query: String!) {
            searchReservations(query: $query) {
              reservations {
                guestName
                contactEmail
              }
              totalCount
            }
          }
        `,
        variables: {
          query: 'John',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(searchQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.searchReservations).toBeDefined();
      expect(response.body.data.searchReservations.totalCount).toBe(1);
      expect(response.body.data.searchReservations.reservations[0].guestName).toContain('John');
    });

    it('should search reservations by email (GraphQL)', async () => {
      const searchQuery = {
        query: `
          query SearchReservations($query: String!) {
            searchReservations(query: $query) {
              reservations {
                guestName
                contactEmail
              }
              totalCount
            }
          }
        `,
        variables: {
          query: 'jane.doe',
        },
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(searchQuery)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.data.searchReservations).toBeDefined();
      expect(response.body.data.searchReservations.totalCount).toBe(1);
      expect(response.body.data.searchReservations.reservations[0].contactEmail).toBe(
        'jane.doe@example.com'
      );
    });
  });
});
