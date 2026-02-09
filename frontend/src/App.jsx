import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

// Eager load only critical components
import LoginPage from './pages/LoginPage';

// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TemplateManagerPage = lazy(() => import('./pages/TemplateManagerPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DecommissionPage = lazy(() => import('./pages/DecommissionPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-slate-400">Cargando...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/templates" element={<TemplateManagerPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/decommission" element={<DecommissionPage />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
