import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_RESERVATIONS } from '../services/graphql/queries';
import { UPDATE_RESERVATION_STATUS } from '../services/graphql/mutations';
import { Reservation, ReservationStatus } from '../types';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, XCircle, Clock, Users, RefreshCw } from 'lucide-react';

const EmployeeDashboard: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'ALL'>('ALL');
  
  const { data, loading, error, refetch } = useQuery(GET_RESERVATIONS, {
    variables: {
      filter: statusFilter !== 'ALL' ? { status: statusFilter } : {},
      pagination: { page: 1, limit: 50 },
      sort: { field: 'expectedArrivalTime', order: 'asc' }
    },
    fetchPolicy: 'network-only'
  });

  const [updateStatus] = useMutation(UPDATE_RESERVATION_STATUS, {
    onCompleted: () => {
      toast.success('Reservation status updated');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleStatusUpdate = (id: string, newStatus: ReservationStatus) => {
    updateStatus({
      variables: {
        id,
        status: newStatus
      }
    });
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

  if (loading && !data) return <div className="flex justify-center py-12">Loading...</div>;
  if (error) return <div className="text-center text-red-600 py-12">Error: {error.message}</div>;

  const reservations: Reservation[] = data?.reservations?.reservations || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Employee Dashboard</h1>
        <button 
          onClick={() => refetch()} 
          className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
            statusFilter === 'ALL'
              ? 'bg-hilton-blue text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          All Reservations
        </button>
        {Object.values(ReservationStatus).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              statusFilter === status
                ? 'bg-hilton-blue text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Reservations Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {reservations.length === 0 ? (
            <li className="px-6 py-12 text-center text-gray-500">
              No reservations found.
            </li>
          ) : (
            reservations.map((reservation) => (
              <li key={reservation.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {reservation.guestName}
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                        {reservation.status}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:space-x-6 gap-2">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {new Date(reservation.expectedArrivalTime).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {new Date(reservation.expectedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {reservation.tableSize} Guests
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="font-medium mr-1">Phone:</span> {reservation.contactPhone}
                      </div>
                    </div>
                    
                    {reservation.notes && (
                      <p className="mt-2 text-sm text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100">
                        Note: {reservation.notes}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="ml-6 flex items-center space-x-2">
                    {reservation.status === ReservationStatus.Requested && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, ReservationStatus.Approved)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          title="Approve"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, ReservationStatus.Cancelled)}
                          className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Decline"
                        >
                          <XCircle size={20} />
                        </button>
                      </>
                    )}
                    
                    {reservation.status === ReservationStatus.Approved && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, ReservationStatus.Completed)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(reservation.id, ReservationStatus.Cancelled)}
                          className="inline-flex items-center p-2 border border-gray-300 rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Cancel"
                        >
                          <XCircle size={20} className="text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
