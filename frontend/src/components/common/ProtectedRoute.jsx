import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, mode = 'admin' }) {
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
