import { Navigate } from 'react-router-dom';

function RedirectIfAuthenticated({ children, to = '/workspace' }) {
  const authDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';
  // AUTH DISABLED FOR TESTING/DEVELOPMENT ONLY. Set VITE_DISABLE_AUTH=true to disable.
  if (authDisabled) {
    return <Navigate to={to} replace />;
  }

  const token = localStorage.getItem('userToken');
  if (token) {
    return <Navigate to={to} replace />;
  }
  return children;
}

export default RedirectIfAuthenticated;
