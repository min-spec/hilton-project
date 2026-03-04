import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Home, Users, LogOut, LogIn, UserPlus } from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={20} /> },
    ...(user?.role === 'guest' ? [
      { path: '/reservations', label: 'Book Table', icon: <Calendar size={20} /> },
      { path: '/my-reservations', label: 'My Bookings', icon: <Calendar size={20} /> },
    ] : []),
    ...(user?.role === 'employee' ? [
      { path: '/employee', label: 'Dashboard', icon: <Users size={20} /> },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-hilton-blue rounded-lg flex items-center justify-center">
                  <Calendar className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Hilton Restaurant
                </span>
              </Link>
              
              {/* Navigation */}
              <nav className="hidden md:ml-10 md:flex md:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={clsx(
                      'inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2',
                      location.pathname === item.path
                        ? 'border-hilton-blue text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    )}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center space-x-2">
                    <div className="w-8 h-8 bg-hilton-gold rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-900">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{user.email}</div>
                      <div className="text-gray-500 capitalize">{user.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={logout}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-blue"
                  >
                    <LogOut size={16} className="mr-2" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-hilton-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-blue"
                  >
                    <LogIn size={16} className="mr-2" />
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-hilton-blue"
                  >
                    <UserPlus size={16} className="mr-2" />
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <div className="md:hidden bg-white border-t">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-around py-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center px-2 py-1 text-xs font-medium',
                  location.pathname === item.path
                    ? 'text-hilton-blue'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {item.icon}
                <span className="mt-1">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center space-x-2">
                <Calendar className="text-hilton-blue" size={20} />
                <span className="text-sm font-semibold text-gray-900">
                  Hilton Restaurant Booking System
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                © {new Date().getFullYear()} Hilton China. All rights reserved.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              <p>Built with React, TypeScript, Node.js & MongoDB</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;