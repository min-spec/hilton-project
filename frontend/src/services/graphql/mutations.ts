import { gql } from '@apollo/client';

export const CREATE_RESERVATION = gql`
  mutation CreateReservation($input: CreateReservationInput!) {
    createReservation(input: $input) {
      id
      guestName
      expectedArrivalTime
      status
      createdAt
    }
  }
`;

export const CANCEL_MY_RESERVATION = gql`
  mutation CancelMyReservation($id: ID!) {
    cancelMyReservation(id: $id) {
      id
      status
    }
  }
`;

export const UPDATE_RESERVATION_STATUS = gql`
  mutation UpdateReservationStatus($id: ID!, $status: ReservationStatus!) {
    updateReservationStatus(id: $id, status: $status) {
      id
      status
      updatedAt
    }
  }
`;

export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation($id: ID!, $input: UpdateReservationInput!) {
    updateReservation(id: $id, input: $input) {
      id
      guestName
      contactEmail
      contactPhone
      expectedArrivalTime
      tableSize
      notes
      updatedAt
    }
  }
`;

export const DELETE_RESERVATION = gql`
  mutation DeleteReservation($id: ID!) {
    deleteReservation(id: $id) {
      success
      message
    }
  }
`;
