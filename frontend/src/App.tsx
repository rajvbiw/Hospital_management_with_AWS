import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import Pharmacy from './pages/Pharmacy';
import Billing from './pages/Billing';
import AuditLog from './pages/AuditLog';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes wrapped in Layout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard accessible to all roles */}
              <Route index element={<Dashboard />} />

              {/* Patients list & details */}
              <Route 
                path="patients" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'billing']}>
                    <Patients />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="patients/:id" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'billing']}>
                    <PatientDetail />
                  </ProtectedRoute>
                } 
              />

              {/* Appointments Scheduling */}
              <Route 
                path="appointments" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'billing']}>
                    <Appointments />
                  </ProtectedRoute>
                } 
              />

              {/* Consultation records mapping */}
              <Route 
                path="records" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                    <MedicalRecords />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="records/new" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'doctor']}>
                    <MedicalRecords />
                  </ProtectedRoute>
                } 
              />

              {/* Pharmacy inventory & pending queue */}
              <Route 
                path="pharmacy" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'pharmacist']}>
                    <Pharmacy />
                  </ProtectedRoute>
                } 
              />

              {/* Billing ledger */}
              <Route 
                path="billing" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'billing']}>
                    <Billing />
                  </ProtectedRoute>
                } 
              />

              {/* Admin compliance audit trails */}
              <Route 
                path="audit" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AuditLog />
                  </ProtectedRoute>
                } 
              />
            </Route>

            {/* Catch-all fallback redirecting to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
