import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Loader from '../../../components/common/Loader';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

import AdminLayout from '../layouts/AdminLayout';


import LoginPage from '../pages/LoginPage';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const UsersPage = lazy(() => import('../pages/UsersPage'));
const VendorsPage = lazy(() => import('../pages/VendorsPage'));
const SalonsPage = lazy(() => import('../pages/SalonsPage'));
const BookingsPage = lazy(() => import('../pages/BookingsPage'));
const CategoriesPage = lazy(() => import('../pages/CategoriesPage'));
const ServicesPage = lazy(() => import('../pages/ServicesPage'));
const PackagesPage = lazy(() => import('../pages/PackagesPage'));

const CouponsPage = lazy(() => import('../pages/CouponsPage'));
const SubscriptionsPage = lazy(() => import('../pages/SubscriptionsPage'));
const CommissionsPage = lazy(() => import('../pages/CommissionsPage'));
const PromotionalVideosPage = lazy(() => import('../pages/PromotionalVideosPage'));
const LoginSlidesPage = lazy(() => import('../pages/LoginSlidesPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const SupportPage = lazy(() => import('../pages/SupportPage'));
const SupportChatPage = lazy(() => import('../pages/SupportChatPage'));
const ContentPage = lazy(() => import('../pages/ContentPage'));
const AdminFAQPage = lazy(() => import('../pages/AdminFAQPage'));
const AdminBookingIssuesPage = lazy(() => import('../pages/AdminBookingIssuesPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const ReviewsPage = lazy(() => import('../pages/ReviewsPage'));
const AdminPaymentsPage = lazy(() => import('../pages/AdminPaymentsPage'));
const VendorCashControlPage = lazy(() => import('../pages/VendorCashControlPage'));

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<Loader text="Loading..." />}>
    {children}
  </Suspense>
);

export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />

      <Route element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
        <Route path="analytics" element={<SuspenseWrapper><AnalyticsPage /></SuspenseWrapper>} />
        <Route path="users" element={<SuspenseWrapper><UsersPage /></SuspenseWrapper>} />
        <Route path="vendors" element={<SuspenseWrapper><VendorsPage /></SuspenseWrapper>} />
        <Route path="vendors/cash-control" element={<SuspenseWrapper><VendorCashControlPage /></SuspenseWrapper>} />
        <Route path="salons" element={<SuspenseWrapper><SalonsPage /></SuspenseWrapper>} />
        <Route path="bookings" element={<SuspenseWrapper><BookingsPage /></SuspenseWrapper>} />
        <Route path="categories" element={<SuspenseWrapper><CategoriesPage /></SuspenseWrapper>} />
        <Route path="services" element={<SuspenseWrapper><ServicesPage /></SuspenseWrapper>} />
        <Route path="packages" element={<SuspenseWrapper><PackagesPage /></SuspenseWrapper>} />

        <Route path="coupons" element={<SuspenseWrapper><CouponsPage /></SuspenseWrapper>} />
        <Route path="subscriptions" element={<SuspenseWrapper><SubscriptionsPage /></SuspenseWrapper>} />
        <Route path="commissions" element={<SuspenseWrapper><CommissionsPage /></SuspenseWrapper>} />
        <Route path="promotional-videos" element={<SuspenseWrapper><PromotionalVideosPage /></SuspenseWrapper>} />
        <Route path="login-slides" element={<SuspenseWrapper><LoginSlidesPage /></SuspenseWrapper>} />
        <Route path="settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
        <Route path="notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
        <Route path="content" element={<SuspenseWrapper><ContentPage /></SuspenseWrapper>} />
        <Route path="faqs" element={<SuspenseWrapper><AdminFAQPage /></SuspenseWrapper>} />
        <Route path="booking-issues" element={<SuspenseWrapper><AdminBookingIssuesPage /></SuspenseWrapper>} />
        <Route path="support" element={<SuspenseWrapper><SupportPage /></SuspenseWrapper>} />
        <Route path="support/:chatId" element={<SuspenseWrapper><SupportChatPage /></SuspenseWrapper>} />
        <Route path="profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
        <Route path="reviews" element={<SuspenseWrapper><ReviewsPage /></SuspenseWrapper>} />
        <Route path="payments" element={<SuspenseWrapper><AdminPaymentsPage /></SuspenseWrapper>} />
      </Route>
    </Routes>
  );
}
