import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ActiveSessionProvider } from './context/ActiveSessionContext';
import { Navbar } from './components/navigation/Navbar';
import { ActiveSessionBanner } from './components/navigation/ActiveSessionBanner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { PublicLandingPage } from './pages/PublicLandingPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ExplorePage } from './pages/ExplorePage';
import { BookingPage } from './pages/BookingPage';
import { FindMyCarPage } from './pages/FindMyCarPage';
import { DemandInsightsPage } from './pages/DemandInsightsPage';
import { BookingsHistoryPage } from './pages/BookingsHistoryPage';
import { LoginPage } from './pages/LoginPage';
import { OwnerDashboardPage } from './pages/OwnerDashboardPage';
import { OwnerSpacesPage } from './pages/OwnerSpacesPage';
import { OwnerBookingsPage } from './pages/OwnerBookingsPage';
import { OwnerEarningsPage } from './pages/OwnerEarningsPage';

// Protected Route Guard for Owner Operations
function OwnerRoute({ children }) {
  const { user, isOwner, loading } = useAuth();

  if (loading) return null;

  if (!user || !isOwner) {
    return <Navigate to="/login?role=owner&redirect=/owner" replace />;
  }

  return children;
}

export function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ActiveSessionBanner />

      <main className="main-content flex-1">
        <Routes>
          {/* Landing / Discover Route: Public Landing when signed out; Full Discovery when signed in */}
          <Route
            path="/"
            element={
              loading ? null : isAuthenticated ? (
                <DiscoverPage />
              ) : (
                <PublicLandingPage />
              )
            }
          />

          {/* Authentication Routes (Public) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />

          {/* Protected Exploration, Map & Facility Booking Routes */}
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <ExplorePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parking/:id"
            element={
              <ProtectedRoute>
                <BookingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/booking" element={<Navigate to="/explore" replace />} />

          {/* Customer Protected Routes (Requires active authenticated session) */}
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <BookingsHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-car"
            element={
              <ProtectedRoute>
                <FindMyCarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/find-my-car"
            element={
              <ProtectedRoute>
                <FindMyCarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <DemandInsightsPage />
              </ProtectedRoute>
            }
          />

          {/* Owner Protected Routes */}
          <Route
            path="/owner"
            element={
              <OwnerRoute>
                <OwnerDashboardPage />
              </OwnerRoute>
            }
          />
          <Route
            path="/owner/spaces"
            element={
              <OwnerRoute>
                <OwnerSpacesPage />
              </OwnerRoute>
            }
          />
          <Route
            path="/owner/bookings"
            element={
              <OwnerRoute>
                <OwnerBookingsPage />
              </OwnerRoute>
            }
          />
          <Route
            path="/owner/earnings"
            element={
              <OwnerRoute>
                <OwnerEarningsPage />
              </OwnerRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Modern Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '2.5rem 0 2rem 0',
          marginTop: 'auto',
        }}
      >
        <div className="app-container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="brand-icon-box" style={{ width: 32, height: 32, fontSize: '1rem' }}>
                <span>P</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                Parkit
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                · Smart Parking &amp; Urban Mobility Platform
              </span>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Built for Coimbatore Urban Mobility · Academic Demonstration
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ActiveSessionProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </ActiveSessionProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
