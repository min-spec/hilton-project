import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, Shield, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Calendar className="text-hilton-blue" size={24} />,
      title: 'Easy Online Booking',
      description: 'Book your table in just a few clicks, 24/7 from any device.'
    },
    {
      icon: <Clock className="text-hilton-blue" size={24} />,
      title: 'Real-time Availability',
      description: 'See available time slots and choose what works best for you.'
    },
    {
      icon: <Users className="text-hilton-blue" size={24} />,
      title: 'Group Reservations',
      description: 'Book tables for any group size, from intimate dinners to large parties.'
    },
    {
      icon: <Shield className="text-hilton-blue" size={24} />,
      title: 'Secure & Reliable',
      description: 'Your data is protected with enterprise-grade security.'
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-hilton-blue to-blue-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Welcome to Hilton Restaurant
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Experience fine dining with our convenient online table reservation system.
              Book your perfect table in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                user.role === 'guest' ? (
                  <>
                    <Link
                      to="/reservations"
                      className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-hilton-gold hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-gold"
                    >
                      <Calendar className="mr-2" size={20} />
                      Book a Table
                    </Link>
                    <Link
                      to="/my-reservations"
                      className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-hilton-blue transition-colors"
                    >
                      View My Bookings
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/employee"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-hilton-gold hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-gold"
                  >
                    <Users className="mr-2" size={20} />
                    Employee Dashboard
                  </Link>
                )
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-hilton-gold hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-gold"
                  >
                    Get Started
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-hilton-blue transition-colors"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
          Why Choose Our Booking System
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-hilton-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Create Account
            </h3>
            <p className="text-gray-600">
              Sign up as a guest to start booking tables.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-hilton-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Select Details
            </h3>
            <p className="text-gray-600">
              Choose date, time, and number of guests.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-hilton-blue text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Confirm Booking
            </h3>
            <p className="text-gray-600">
              Review details and confirm your reservation.
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-hilton-blue mb-2">99%</div>
          <div className="text-gray-600">Booking Success Rate</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-hilton-blue mb-2">24/7</div>
          <div className="text-gray-600">Online Support</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-hilton-blue mb-2">5 min</div>
          <div className="text-gray-600">Average Booking Time</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-hilton-blue mb-2">10k+</div>
          <div className="text-gray-600">Happy Customers</div>
        </div>
      </div>

      {/* CTA */}
      {!user && (
        <div className="bg-gradient-to-r from-hilton-gold to-yellow-500 rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Book Your Table?
          </h2>
          <p className="text-gray-800 mb-6">
            Join thousands of satisfied customers who trust our booking system.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-hilton-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-blue"
          >
            <CheckCircle className="mr-2" size={20} />
            Start Booking Now
          </Link>
        </div>
      )}
    </div>
  );
};

export default HomePage;