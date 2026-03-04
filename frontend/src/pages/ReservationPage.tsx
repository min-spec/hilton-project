import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@apollo/client';
import { CREATE_RESERVATION } from '../services/graphql/mutations';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, Mail, Phone, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const reservationSchema = z.object({
  guestName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  guestPhone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  guestEmail: z.string().email('Invalid email address'),
  tableSize: z.number().min(1).max(20),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

const ReservationPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      tableSize: 2,
    },
  });

  const watchTableSize = watch('tableSize');
  // Use watchTableSize to ensure re-render when table size changes
  React.useEffect(() => {
    // This effect ensures that the component re-renders when table size changes
    // which is necessary for the summary sidebar to update correctly
  }, [watchTableSize]);

  const [createReservation] = useMutation(CREATE_RESERVATION, {
    onCompleted: () => {
      toast.success('Reservation created successfully!');
      reset();
      setSelectedDate('');
      setSelectedTime('');
      navigate('/my-reservations');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create reservation');
    },
  });

  const onSubmit = (data: ReservationFormData) => {
    const expectedArrivalTime = `${selectedDate}T${selectedTime}:00`;
    
    createReservation({
      variables: {
        input: {
          guestName: data.guestName,
          contactEmail: data.guestEmail,
          contactPhone: data.guestPhone,
          expectedArrivalTime,
          tableSize: data.tableSize,
        },
      },
    });
  };

  // Generate time slots
  const timeSlots = [];
  for (let hour = 11; hour <= 22; hour++) {
    for (let minute of ['00', '30']) {
      if (hour === 22 && minute === '30') break;
      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
      timeSlots.push(time);
    }
  }

  // Generate next 30 days
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book a Table</h1>
        <p className="text-gray-600 mt-2">
          Reserve your table at Hilton Restaurant for an unforgettable dining experience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="mr-2" size={20} />
                  Personal Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      {...register('guestName')}
                      className="input-field"
                      placeholder="John Doe"
                    />
                    {errors.guestName && (
                      <p className="mt-1 text-sm text-red-600">{errors.guestName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="tel"
                        {...register('guestPhone')}
                        className="pl-10 input-field"
                        placeholder="+1234567890"
                      />
                    </div>
                    {errors.guestPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.guestPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      {...register('guestEmail')}
                      className="pl-10 input-field"
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.guestEmail && (
                    <p className="mt-1 text-sm text-red-600">{errors.guestEmail.message}</p>
                  )}
                </div>
              </div>

              {/* Date & Time Selection */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Date & Time
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Date *
                    </label>
                    <select
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">Choose a date</option>
                      {dates.map((date) => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Time *
                    </label>
                    <select
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      className="input-field"
                      required
                      disabled={!selectedDate}
                    >
                      <option value="">Choose a time</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Table Size */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="mr-2" size={20} />
                  Party Size
                </h2>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Guests *
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      {...register('tableSize', { valueAsNumber: true })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>1</span>
                      <span>10</span>
                      <span>20</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-hilton-blue">
                      {watchTableSize || 2}
                    </div>
                    <div className="text-sm text-gray-500">Guests</div>
                  </div>
                </div>
                {errors.tableSize && (
                  <p className="mt-1 text-sm text-red-600">{errors.tableSize.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedDate || !selectedTime}
                  className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Reservation'
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  You'll receive a confirmation email once your booking is approved.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar - Booking Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Booking Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium">
                  {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Not selected'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Time:</span>
                <span className="font-medium">{selectedTime || 'Not selected'}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Guests:</span>
                <span className="font-medium">{watchTableSize || 2} people</span>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span className="text-hilton-blue">Free Reservation</span>
                </div>
              </div>
            </div>

            {/* Restaurant Info */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-3">
                Hilton Restaurant Info
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <Clock className="mr-2" size={16} />
                  Open: 11:00 AM - 11:00 PM
                </li>
                <li>• Maximum 20 guests per table</li>
                <li>• 15-minute grace period for late arrivals</li>
                <li>• Special requests can be added in notes</li>
                <li>• Cancellation policy: 2 hours before</li>
              </ul>
            </div>

            {/* Need Help */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
              <p className="text-sm text-blue-700 mb-3">
                Contact our support team for assistance with your booking.
              </p>
              <div className="text-sm">
                <div className="font-medium">Phone: +1 (234) 567-8900</div>
                <div className="text-blue-600">support@hiltonrestaurant.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
