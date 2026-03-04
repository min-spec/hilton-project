const { gql } = require('apollo-server-express');

const typeDefs = gql`
  # Scalars
  scalar DateTime
  scalar JSON

  # Types
  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    phone: String
    role: UserRole!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastLogin: DateTime
  }

  type Reservation {
    id: ID!
    guestName: String!
    contactEmail: String!
    contactPhone: String!
    expectedArrivalTime: DateTime!
    tableSize: Int!
    status: ReservationStatus!
    notes: String
    userId: ID
    processedBy: ID
    approvedAt: DateTime
    cancelledAt: DateTime
    completedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!

    # Virtual fields
    formattedArrivalTime: String!
    durationSinceCreation: String!
    canCancel: Boolean!

    # Relationships (if needed)
    user: User
    processedByUser: User
  }

  type ReservationStats {
    total: Int!
    requested: Int!
    approved: Int!
    cancelled: Int!
    completed: Int!
    today: Int!
    upcoming: Int!
  }

  type PaginatedReservations {
    reservations: [Reservation!]!
    totalCount: Int!
    totalPages: Int!
    currentPage: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type QueryResponse {
    success: Boolean!
    message: String
    data: JSON
  }

  # Enums
  enum UserRole {
    guest
    employee
    admin
  }

  enum ReservationStatus {
    Requested
    Approved
    Cancelled
    Completed
  }

  enum SortOrder {
    asc
    desc
  }

  enum ReservationSortField {
    guestName
    expectedArrivalTime
    createdAt
    status
    tableSize
  }

  # Input Types
  input RegisterInput {
    email: String!
    password: String!
    firstName: String!
    lastName: String!
    phone: String
    role: UserRole = guest
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateReservationInput {
    guestName: String!
    contactEmail: String!
    contactPhone: String!
    expectedArrivalTime: DateTime!
    tableSize: Int!
    notes: String
  }

  input UpdateReservationInput {
    guestName: String
    contactEmail: String
    contactPhone: String
    expectedArrivalTime: DateTime
    tableSize: Int
    notes: String
  }

  input ReservationFilterInput {
    date: String # YYYY-MM-DD format
    status: ReservationStatus
    guestName: String
    contactEmail: String
    minTableSize: Int
    maxTableSize: Int
    startDate: DateTime
    endDate: DateTime
  }

  input ReservationSortInput {
    field: ReservationSortField! = expectedArrivalTime
    order: SortOrder! = asc
  }

  input PaginationInput {
    page: Int! = 1
    limit: Int! = 20
  }

  # Queries
  type Query {
    # Authentication
    me: User!

    # Reservations
    reservations(
      filter: ReservationFilterInput
      sort: ReservationSortInput
      pagination: PaginationInput
    ): PaginatedReservations!

    reservation(id: ID!): Reservation!

    myReservations(
      filter: ReservationFilterInput
      sort: ReservationSortInput
      pagination: PaginationInput
    ): PaginatedReservations!

    # Statistics
    reservationStats: ReservationStats!

    # Admin queries
    allUsers(role: UserRole, isActive: Boolean, pagination: PaginationInput): [User!]!

    user(id: ID!): User!

    # Search
    searchReservations(query: String!, pagination: PaginationInput): PaginatedReservations!

    # Health check
    health: QueryResponse!
  }

  # Mutations
  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!
    logout: QueryResponse!
    updateProfile(firstName: String, lastName: String, phone: String): User!
    changePassword(currentPassword: String!, newPassword: String!): QueryResponse!

    # Reservation Operations (Guest)
    createReservation(input: CreateReservationInput!): Reservation!
    updateMyReservation(id: ID!, input: UpdateReservationInput!): Reservation!
    cancelMyReservation(id: ID!): Reservation!

    # Reservation Operations (Employee/Admin)
    updateReservationStatus(id: ID!, status: ReservationStatus!): Reservation!
    updateReservation(id: ID!, input: UpdateReservationInput!): Reservation!
    deleteReservation(id: ID!): QueryResponse!

    # User Management (Admin)
    createUser(input: RegisterInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deactivateUser(id: ID!): QueryResponse!
    activateUser(id: ID!): QueryResponse!

    # System
    sendReservationReminder(id: ID!): QueryResponse!
    bulkUpdateReservations(ids: [ID!]!, status: ReservationStatus!): [Reservation!]!
  }

  input UpdateUserInput {
    email: String
    firstName: String
    lastName: String
    phone: String
    role: UserRole
    isActive: Boolean
  }

  # Subscriptions (for real-time updates)
  type Subscription {
    # Real-time reservation updates
    reservationCreated: Reservation!
    reservationUpdated: Reservation!
    reservationStatusChanged: Reservation!

    # System notifications
    newReservationNotification: String!
    reservationReminder: String!

    # Admin notifications
    systemAlert: String!
  }
`;

module.exports = typeDefs;
