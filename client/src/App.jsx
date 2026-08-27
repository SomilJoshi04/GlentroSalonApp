import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CallProvider } from './context/CallContext';
import { NotificationProvider } from './context/NotificationContext';
import { LocationProvider } from './context/LocationContext';
import { SettingProvider } from './context/SettingContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { ConfirmProvider } from './context/ConfirmContext';

import UserRoutes from './modules/user/routes';
import VendorRoutes from './modules/vendor/routes';
import AdminRoutes from './modules/admin/routes';
import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <AuthProvider>
        <SocketProvider>
          <CallProvider>
            <NotificationProvider>
              <LocationProvider>
                <SettingProvider>
                  <FavoriteProvider>
                    <ConfirmProvider>
                      <Routes>
                        {/* Module Routes */}
                        <Route path="/admin/*" element={<AdminRoutes />} />
                        <Route path="/vendor/*" element={<VendorRoutes />} />
                        <Route path="/*" element={<UserRoutes />} />
                      </Routes>
                    </ConfirmProvider>
                  </FavoriteProvider>
                </SettingProvider>
              </LocationProvider>
            </NotificationProvider>
          </CallProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
