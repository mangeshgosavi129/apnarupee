/**
 * Main App Component
 * Sets up routing and main layout
 */
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useApplicationStore } from './store/applicationStore';

// Pages (to be created)
import EntitySelection from './pages/EntitySelection';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import './index.css';

function ProtectedRoute({ children }) {
  const isAuthenticated = useApplicationStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const isAuthenticated = useApplicationStore((state) => state.isAuthenticated);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/onboarding" replace /> : <EntitySelection />
          } />
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/onboarding" replace /> : <Login />
          } />

          {/* Protected Routes */}
          <Route path="/onboarding/*" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
