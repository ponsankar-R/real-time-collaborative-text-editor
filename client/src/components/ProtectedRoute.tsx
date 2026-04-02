import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute - loading:', loading, 'user:', user, 'path:', location.pathname); // Debug

  // Show loading while checking auth
  if (loading) {
    console.log('⏳ Showing loading spinner...'); // Debug
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('🚫 Redirecting to login...'); // Debug
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ Rendering protected content'); // Debug
  // User is authenticated, render children
  return <>{children}</>;
}