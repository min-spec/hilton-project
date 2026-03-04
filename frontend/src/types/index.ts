export enum UserRole {
  Guest = 'guest',
  Employee = 'employee',
  Admin = 'admin',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export enum ReservationStatus {
  Requested = 'Requested',
  Approved = 'Approved',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
}

export interface Reservation {
  id: string;
  guestName: string;
  contactEmail: string;
  contactPhone: string;
  expectedArrivalTime: string;
  tableSize: number;
  status: ReservationStatus;
  notes?: string;
  userId?: string;
  processedBy?: string;
  approvedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  formattedArrivalTime: string;
  durationSinceCreation: string;
  canCancel: boolean;
}

export interface AuthPayload {
  user: User;
  token: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: UserRole;
}

export interface CreateReservationInput {
  guestName: string;
  contactEmail: string;
  contactPhone: string;
  expectedArrivalTime: string;
  tableSize: number;
  notes?: string;
}

export interface UpdateReservationInput {
  guestName?: string;
  contactEmail?: string;
  contactPhone?: string;
  expectedArrivalTime?: string;
  tableSize?: number;
  notes?: string;
}

export interface ReservationFilter {
  date?: string;
  status?: ReservationStatus;
  guestName?: string;
  contactEmail?: string;
  minTableSize?: number;
  maxTableSize?: number;
  startDate?: string;
  endDate?: string;
}
