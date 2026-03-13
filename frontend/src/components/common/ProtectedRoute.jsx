import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, mode = 'admin' }) {
  const authDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';
  // AUTH DISABLED FOR TESTING/DEVELOPMENT ONLY. Set VITE_DISABLE_AUTH=true to disable.
  if (authDisabled) {
    return children;
  }

  if (mode === 'user') {
    const token = localStorage.getItem('userToken');
    if (!token) {
      return <Navigate to="/auth" replace />;
    }
    return children;
  }

  const adminKey = localStorage.getItem('adminKey');
  if (!adminKey) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
