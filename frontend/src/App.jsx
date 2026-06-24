import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ForcePasswordChange from './components/ForcePasswordChange';

// Eager load only critical components
import LoginPage from './pages/LoginPage';

// Lazy load heavy components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TemplateManagerPage = lazy(() => import('./pages/TemplateManagerPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const DecommissionPage = lazy(() => import('./pages/DecommissionPage'));
const HRAlertsPage = lazy(() => import('./pages/HRAlertsPage'));
const IngressosPage = lazy(() => import('./pages/IngressosPage'));
const LanchasPage   = lazy(() => import('./pages/LanchasPage'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen bg-bg dark:bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      <p className="mt-4 text-slate-500 dark:text-slate-400">Cargando...</p>
    </div>
  </div>
);

// Intercepts navigation when user must change password
const AppRoutes = () => {
  const { user } = useAuth();

  if (user?.must_change_password) {
    return <ForcePasswordChange />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<TemplateManagerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/decommission" element={<DecommissionPage />} />
          <Route path="/hr-alerts" element={<HRAlertsPage />} />
          <Route path="/ingresos" element={<IngressosPage />} />
          <Route path="/lanchas" element={<LanchasPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <AppRoutes />
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
