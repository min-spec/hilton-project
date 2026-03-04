import { gql } from '@apollo/client';

export const GET_MY_RESERVATIONS = gql`
  query GetMyReservations($filter: ReservationFilterInput, $sort: ReservationSortInput, $pagination: PaginationInput) {
    myReservations(filter: $filter, sort: $sort, pagination: $pagination) {
      reservations {
        id
        guestName
        contactEmail
        contactPhone
        expectedArrivalTime
        tableSize
        status
        notes
        createdAt
        formattedArrivalTime
        canCancel
      }
      totalCount
      totalPages
      currentPage
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const GET_RESERVATIONS = gql`
  query GetReservations($filter: ReservationFilterInput, $sort: ReservationSortInput, $pagination: PaginationInput) {
    reservations(filter: $filter, sort: $sort, pagination: $pagination) {
      reservations {
        id
        guestName
        contactEmail
        contactPhone
        expectedArrivalTime
        tableSize
        status
        notes
        createdAt
        formattedArrivalTime
      }
      totalCount
      totalPages
      currentPage
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const GET_RESERVATION = gql`
  query GetReservation($id: ID!) {
    reservation(id: $id) {
      id
      guestName
      contactEmail
      contactPhone
      expectedArrivalTime
      tableSize
      status
      notes
      createdAt
      updatedAt
      formattedArrivalTime
      canCancel
      user {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

export const GET_RESERVATION_STATS = gql`
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
`;
