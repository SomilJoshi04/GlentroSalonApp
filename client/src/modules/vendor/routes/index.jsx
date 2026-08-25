import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Loader from '../../../components/common/Loader';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

// We need to move VendorLayout from vendor-app to client/src/modules/vendor/layouts/
// Assuming they are already there or will be mapped
import VendorLayout from '../layouts/VendorLayout';


import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';

const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage'));
const SalonManagePage = lazy(() => import('../pages/SalonManagePage'));
const StaffManagePage = lazy(() => import('../pages/StaffManagePage'));
const ServiceManagePage = lazy(() => import('../pages/ServiceManagePage'));
const BookingManagePage = lazy(() => import('../pages/BookingManagePage'));
const BookingDetailPage = lazy(() => import('../pages/BookingDetailPage'));
const PackageManagePage = lazy(() => import('../pages/PackageManagePage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const ChatListPage = lazy(() => import('../pages/ChatListPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const ReviewsPage = lazy(() => import('../pages/ReviewsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const VendorFinancialPage = lazy(() => import('../pages/VendorFinancialPage'));
const VendorSubscriptionPage = lazy(() => import('../pages/VendorSubscriptionPage'));

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<Loader text="Loading..." />}>
    {children}
  </Suspense>
);

import { BranchProvider } from '../../../context/BranchContext';

export default function VendorRoutes() {
  return (
    <BranchProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute role="vendor"><VendorLayout /></ProtectedRoute>}>
          <Route index element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
          <Route path="analytics" element={<SuspenseWrapper><AnalyticsPage /></SuspenseWrapper>} />
          <Route path="salons" element={<SuspenseWrapper><SalonManagePage /></SuspenseWrapper>} />
          <Route path="staff" element={<SuspenseWrapper><StaffManagePage /></SuspenseWrapper>} />
          <Route path="services" element={<SuspenseWrapper><ServiceManagePage /></SuspenseWrapper>} />
          <Route path="bookings" element={<SuspenseWrapper><BookingManagePage /></SuspenseWrapper>} />
          <Route path="booking/:id" element={<SuspenseWrapper><BookingDetailPage /></SuspenseWrapper>} />
          <Route path="chats" element={<SuspenseWrapper><ChatListPage /></SuspenseWrapper>} />
          <Route path="chat/:chatId" element={<SuspenseWrapper><ChatPage /></SuspenseWrapper>} />
          <Route path="packages" element={<SuspenseWrapper><PackageManagePage /></SuspenseWrapper>} />

          <Route path="profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
          <Route path="reviews" element={<SuspenseWrapper><ReviewsPage /></SuspenseWrapper>} />
          <Route path="notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
          <Route path="financials" element={<SuspenseWrapper><VendorFinancialPage /></SuspenseWrapper>} />
          <Route path="subscription" element={<SuspenseWrapper><VendorSubscriptionPage /></SuspenseWrapper>} />
        </Route>
      </Routes>
    </BranchProvider>
  );
}
