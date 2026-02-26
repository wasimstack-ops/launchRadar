import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import AuthPage from '../pages/AuthPage';
import ProfilePage from '../pages/ProfilePage';
import ListingsPage from '../pages/ListingsPage';
import CategoryProductsPage from '../pages/CategoryProductsPage';
import ListingFormPage from '../pages/ListingFormPage';
import SubmitListingPage from '../pages/SubmitListingPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import ProtectedRoute from '../components/common/ProtectedRoute';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ListingsPage />} />
        <Route path="/category/:slug" element={<CategoryProductsPage />} />
        <Route path="/listing/:id" element={<ListingFormPage />} />

        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/me"
          element={
            <ProtectedRoute mode="user">
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit"
          element={
            <ProtectedRoute mode="user">
              <SubmitListingPage />
            </ProtectedRoute>
          }
        />

        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute mode="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
