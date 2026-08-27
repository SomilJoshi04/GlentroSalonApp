import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Loader from '../../../components/common/Loader';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import LegalPageLayout from '../layouts/LegalPageLayout';
import ProtectedRoute from '../../../components/common/ProtectedRoute';

import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import HomePage from '../pages/home/HomePage';
import SearchPage from '../pages/home/SearchPage';

const SalonListPage = lazy(() => import('../pages/salon/SalonListPage'));
const SalonDetailPage = lazy(() => import('../pages/salon/SalonDetailPage'));
const ContentPage = lazy(() => import('../pages/profile/ContentPage'));
const BookingPage = lazy(() => import('../pages/booking/BookingPage'));
const CheckoutPage = lazy(() => import('../pages/booking/CheckoutPage'));
const BookingListPage = lazy(() => import('../pages/booking/BookingListPage'));
const BookingDetailPage = lazy(() => import('../pages/booking/BookingDetailPage'));
const ChatListPage = lazy(() => import('../pages/chat/ChatListPage'));
const ChatPage = lazy(() => import('../pages/chat/ChatPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const ProfilePage = lazy(() => import('../pages/profile/ProfilePage'));
const FavoritesPage = lazy(() => import('../pages/profile/FavoritesPage'));
const SupportPage = lazy(() => import('../pages/profile/SupportPage'));
const BookingIssuesPage = lazy(() => import('../pages/profile/BookingIssuesPage'));
const CallHistoryPage = lazy(() => import('../pages/profile/CallHistoryPage'));
import OffersPage from '../pages/home/OffersPage';

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<Loader text="Loading page..." />}>
    {children}
  </Suspense>
);

export default function UserRoutes() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Public Routes under MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/salons" element={<SuspenseWrapper><SalonListPage /></SuspenseWrapper>} />
        <Route path="/salon/:id" element={<SuspenseWrapper><SalonDetailPage /></SuspenseWrapper>} />
        <Route path="/salon/:id/book" element={<SuspenseWrapper><BookingPage /></SuspenseWrapper>} />
        <Route path="/salon/:id/checkout" element={<SuspenseWrapper><CheckoutPage /></SuspenseWrapper>} />
        <Route path="/booking-issues" element={<SuspenseWrapper><BookingIssuesPage /></SuspenseWrapper>} />
      </Route>

      {/* Protected Routes under MainLayout */}
      <Route element={<ProtectedRoute role="user"><MainLayout /></ProtectedRoute>}>
        <Route path="/bookings" element={<SuspenseWrapper><BookingListPage /></SuspenseWrapper>} />
        <Route path="/booking/:id" element={<SuspenseWrapper><BookingDetailPage /></SuspenseWrapper>} />
        <Route path="/chat" element={<SuspenseWrapper><ChatListPage /></SuspenseWrapper>} />
        <Route path="/chat/:chatId" element={<SuspenseWrapper><ChatPage /></SuspenseWrapper>} />
        <Route path="/notifications" element={<SuspenseWrapper><NotificationsPage /></SuspenseWrapper>} />
        <Route path="/profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
        <Route path="/favorites" element={<SuspenseWrapper><FavoritesPage /></SuspenseWrapper>} />
        <Route path="/call-history" element={<SuspenseWrapper><CallHistoryPage /></SuspenseWrapper>} />
      </Route>

      {/* Guest/Public Legal Pages */}
      <Route element={<LegalPageLayout />}>
        <Route path="/privacy-policy" element={<SuspenseWrapper><ContentPage type="privacy_policy" titleFallback="Privacy Policy" /></SuspenseWrapper>} />
        <Route path="/terms-and-conditions" element={<SuspenseWrapper><ContentPage type="terms_conditions" titleFallback="Terms & Conditions" /></SuspenseWrapper>} />
        <Route path="/help-support" element={<SuspenseWrapper><SupportPage /></SuspenseWrapper>} />
        <Route path="/support" element={<SuspenseWrapper><SupportPage /></SuspenseWrapper>} />
      </Route>
    </Routes>
  );
}
