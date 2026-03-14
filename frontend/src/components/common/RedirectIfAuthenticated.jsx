import { Navigate } from 'react-router-dom';

function RedirectIfAuthenticated({ children, to = '/workspace' }) {
  const authDisabled = false;
  // AUTH DISABLED FOR TESTING/DEVELOPMENT ONLY.
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
