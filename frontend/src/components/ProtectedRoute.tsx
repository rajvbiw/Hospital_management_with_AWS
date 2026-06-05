import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'doctor' | 'nurse' | 'pharmacist' | 'billing')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, token } = useAuth();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-4 animate-bounce">
          <ShieldAlert size={48} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-slate-500 max-w-md">
          Your account role (<span className="font-semibold text-slate-700 capitalize">{user.role}</span>) does not have authorization to view this resource. Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
