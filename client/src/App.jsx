import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { NotificationProvider } from './context/NotificationContext';
import { LocationProvider } from './context/LocationContext';
import { SettingProvider } from './context/SettingContext';
import { FavoriteProvider } from './context/FavoriteContext';

import UserRoutes from './modules/user/routes';
import VendorRoutes from './modules/vendor/routes';
import AdminRoutes from './modules/admin/routes';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <AuthProvider>
        <SocketProvider>
          <NotificationProvider>
            <LocationProvider>
              <SettingProvider>
                <FavoriteProvider>
                  <Routes>
                    {/* Module Routes */}
                    <Route path="/admin/*" element={<AdminRoutes />} />
                    <Route path="/vendor/*" element={<VendorRoutes />} />
                    <Route path="/*" element={<UserRoutes />} />
                  </Routes>
                </FavoriteProvider>
              </SettingProvider>
            </LocationProvider>
          </NotificationProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
