import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile as getUserProfile } from '../services/api/authApi';
import { getProfile as getVendorProfile } from '../modules/vendor/services/vendorApi';
import { getProfile as getAdminProfile } from '../modules/admin/services/adminApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [vendor, setVendor] = useState(() => {
    const saved = localStorage.getItem('vendor');
    return saved ? JSON.parse(saved) : null;
  });
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('admin');
    return saved ? JSON.parse(saved) : null;
  });

  const [userToken, setUserToken] = useState(localStorage.getItem('token')); // keep 'token' for user backwards compatibility
  const [vendorToken, setVendorToken] = useState(localStorage.getItem('vendor_token'));
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      const promises = [];
      if (userToken) promises.push(getUserProfile(userToken).then(r => setUser(r.data.data.user)).catch((e) => console.error('Failed to load user profile', e)));
      if (vendorToken) promises.push(getVendorProfile(vendorToken).then(r => setVendor(r.data.data.user)).catch((e) => console.error('Failed to load vendor profile', e)));
      if (adminToken) promises.push(getAdminProfile(adminToken).then(r => setAdmin(r.data.data.user)).catch((e) => console.error('Failed to load admin profile', e)));

      await Promise.allSettled(promises);
      setLoading(false);
    };
    loadProfiles();
  }, [userToken, vendorToken, adminToken]);


  // General login function, caller must handle API call and pass result
  const setAuth = useCallback((role, userData, token) => {
    if (role === 'user') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUserToken(token);
      setUser(userData);
    } else if (role === 'vendor') {
      localStorage.setItem('vendor_token', token);
      localStorage.setItem('vendor', JSON.stringify(userData));
      setVendorToken(token);
      setVendor(userData);
    } else if (role === 'admin') {
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin', JSON.stringify(userData));
      setAdminToken(token);
      setAdmin(userData);
    }
  }, []);

  const logout = useCallback((role) => {
    if (role === 'user') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('location_prompt_dismissed');
      localStorage.removeItem('guest_location');
      setUserToken(null);
      setUser(null);
    } else if (role === 'vendor') {
      localStorage.removeItem('vendor_token');
      localStorage.removeItem('vendor');
      localStorage.removeItem('vendor_selected_salon');
      setVendorToken(null);
      setVendor(null);
    } else if (role === 'admin') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin');
      setAdminToken(null);
      setAdmin(null);
    }
  }, []);

  useEffect(() => {
    const handleAuthUnauthorized = (e) => {
      const role = e.detail?.role;
      if (role) {
        logout(role);
      }
    };
    window.addEventListener('auth:unauthorized', handleAuthUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleAuthUnauthorized);
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user, vendor, admin,
      userToken, vendorToken, adminToken,
      isAuthenticated: !!user,
      loading,
      setAuth, logout,
      setUser, setVendor, setAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
