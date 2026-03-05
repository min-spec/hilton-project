// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

// Create database and collections
db = db.getSiblingDB("hilton_reservations");

// Create users collection with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "email",
        "password",
        "firstName",
        "lastName",
        "role",
        "isActive",
      ],
      properties: {
        email: {
          bsonType: "string",
          description: "must be a string and is required",
          pattern: "^\\S+@\\S+\\.\\S+$",
        },
        password: {
          bsonType: "string",
          description: "must be a string and is required",
          minLength: 8,
        },
        firstName: {
          bsonType: "string",
          description: "must be a string and is required",
          minLength: 2,
        },
        lastName: {
          bsonType: "string",
          description: "must be a string and is required",
          minLength: 2,
        },
        role: {
          enum: ["guest", "employee", "admin"],
          description: "must be one of: guest, employee, admin",
        },
        isActive: {
          bsonType: "bool",
          description: "must be a boolean",
        },
      },
    },
  },
});

// Create reservations collection with validation
db.createCollection("reservations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "guestName",
        "contactEmail",
        "contactPhone",
        "expectedArrivalTime",
        "tableSize",
        "status",
      ],
      properties: {
        guestName: {
          bsonType: "string",
          description: "must be a string and is required",
          minLength: 2,
        },
        contactEmail: {
          bsonType: "string",
          description: "must be a string and is required",
          pattern: "^\\S+@\\S+\\.\\S+$",
        },
        contactPhone: {
          bsonType: "string",
          description: "must be a string and is required",
        },
        expectedArrivalTime: {
          bsonType: "date",
          description: "must be a date and is required",
        },
        tableSize: {
          bsonType: "int",
          minimum: 1,
          maximum: 20,
          description: "must be an integer between 1 and 20",
        },
        status: {
          enum: ["Requested", "Approved", "Cancelled", "Completed"],
          description:
            "must be one of: Requested, Approved, Cancelled, Completed",
        },
      },
    },
  },
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: -1 });

db.reservations.createIndex({ expectedArrivalTime: 1 });
db.reservations.createIndex({ status: 1 });
db.reservations.createIndex({ contactEmail: 1 });
db.reservations.createIndex({ guestName: 1 });
db.reservations.createIndex({ createdAt: -1 });
db.reservations.createIndex({ userId: 1 });
db.reservations.createIndex({ status: 1, expectedArrivalTime: 1 });
db.reservations.createIndex({ contactEmail: 1, expectedArrivalTime: -1 });

// Insert initial test data (optional - for development)
if (process.env.INSERT_TEST_DATA === "true") {
  print("Inserting test data...");

  // Test users
  db.users.insertMany([
    {
      email: "guest@example.com",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMye3HvJYwJpB8lP5Bd7J8v6n9Q1q2w3x4y", // password123
      firstName: "Test",
      lastName: "Guest",
      phone: "+1234567890",
      role: "guest",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: "employee@example.com",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMye3HvJYwJpB8lP5Bd7J8v6n9Q1q2w3x4y", // password123
      firstName: "Test",
      lastName: "Employee",
      phone: "+1234567891",
      role: "employee",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      email: "admin@example.com",
      password: "$2a$10$N9qo8uLOickgx2ZMRZoMye3HvJYwJpB8lP5Bd7J8v6n9Q1q2w3x4y", // password123
      firstName: "Test",
      lastName: "Admin",
      phone: "+1234567892",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // Test reservations
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const dayAfterTomorrow = new Date();
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  dayAfterTomorrow.setHours(20, 0, 0, 0);

  db.reservations.insertMany([
    {
      guestName: "John Smith",
      contactEmail: "john.smith@example.com",
      contactPhone: "+1111111111",
      expectedArrivalTime: tomorrow,
      tableSize: 2,
      status: "Requested",
      notes: "Window seat preferred",
      userId: db.users.findOne({ email: "guest@example.com" })._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      guestName: "Jane Doe",
      contactEmail: "jane.doe@example.com",
      contactPhone: "+2222222222",
      expectedArrivalTime: dayAfterTomorrow,
      tableSize: 4,
      status: "Approved",
      notes: "Birthday celebration",
      userId: db.users.findOne({ email: "guest@example.com" })._id,
      processedBy: db.users.findOne({ email: "employee@example.com" })._id,
      approvedAt: new Date(),
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      updatedAt: new Date(),
    },
  ]);

  print("Test data inserted successfully.");
}

print("MongoDB initialization completed.");
