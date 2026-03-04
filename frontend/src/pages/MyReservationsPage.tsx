import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { Link } from 'react-router-dom';
import { GET_MY_RESERVATIONS } from '../services/graphql/queries';
import { CANCEL_MY_RESERVATION } from '../services/graphql/mutations';
import { Reservation, ReservationStatus } from '../types';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, XCircle, AlertCircle, Plus } from 'lucide-react';

const MyReservationsPage: React.FC = () => {
  const { data, loading, error, refetch } = useQuery(GET_MY_RESERVATIONS, {
    variables: {
      pagination: { page: 1, limit: 50 },
      sort: { field: 'expectedArrivalTime', order: 'desc' }
    },
    fetchPolicy: 'network-only'
  });

  const [cancelReservation, { loading: cancelling }] = useMutation(CANCEL_MY_RESERVATION, {
    onCompleted: () => {
      toast.success('Reservation cancelled successfully');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to cancel reservation');
    }
  });

  const handleCancel = (id: string) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      cancelReservation({ variables: { id } });
    }
  };

  const getStatusColor = (status: ReservationStatus) => {
    switch (status) {
      case ReservationStatus.Approved:
        return 'bg-green-100 text-green-800';
      case ReservationStatus.Requested:
        return 'bg-blue-100 text-blue-800';
      case ReservationStatus.Cancelled:
        return 'bg-red-100 text-red-800';
      case ReservationStatus.Completed:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hilton-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Error loading reservations</h3>
        <p className="mt-2 text-gray-500">{error.message}</p>
      </div>
    );
  }

  const reservations: Reservation[] = data?.myReservations?.reservations || [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Reservations</h1>
          <p className="text-gray-600 mt-2">Manage your upcoming and past dining reservations.</p>
        </div>
        <Link
          to="/reservations"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-hilton-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-blue"
        >
          <Plus className="mr-2" size={20} />
          New Reservation
        </Link>
      </div>

      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Calendar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reservations found</h3>
          <p className="text-gray-500 mb-6">You haven't made any reservations yet.</p>
          <Link
            to="/reservations"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-hilton-blue hover:bg-blue-700"
          >
            Book a Table Now
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(reservation.status)}`}>
                        {reservation.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        Reference: #{reservation.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center text-gray-700">
                        <Calendar className="mr-2 text-hilton-blue" size={18} />
                        <span className="font-medium">
                          {new Date(reservation.expectedArrivalTime).toLocaleDateString(undefined, {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Clock className="mr-2 text-hilton-blue" size={18} />
                        <span className="font-medium">
                          {new Date(reservation.expectedArrivalTime).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-700">
                        <Users className="mr-2 text-hilton-blue" size={18} />
                        <span className="font-medium">{reservation.tableSize} Guests</span>
                      </div>
                    </div>
                    
                    {reservation.notes && (
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        <span className="font-semibold">Note:</span> {reservation.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center">
                    {reservation.canCancel && (
                      <button
                        onClick={() => handleCancel(reservation.id)}
                        disabled={cancelling}
                        className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="mr-2" size={16} />
                        Cancel Reservation
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReservationsPage;
