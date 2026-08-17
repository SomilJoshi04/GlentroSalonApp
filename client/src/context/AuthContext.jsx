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
  const [user, setUser] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [admin, setAdmin] = useState(null);

  const [userToken, setUserToken] = useState(localStorage.getItem('token')); // keep 'token' for user backwards compatibility
  const [vendorToken, setVendorToken] = useState(localStorage.getItem('vendor_token'));
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      const promises = [];
      if (userToken) promises.push(getUserProfile(userToken).then(r => setUser(r.data.data.user)).catch(() => { localStorage.removeItem('token'); setUserToken(null); }));
      if (vendorToken) promises.push(getVendorProfile(vendorToken).then(r => setVendor(r.data.data.user)).catch(() => { localStorage.removeItem('vendor_token'); setVendorToken(null); }));
      if (adminToken) promises.push(getAdminProfile(adminToken).then(r => setAdmin(r.data.data.user)).catch(() => { localStorage.removeItem('admin_token'); setAdminToken(null); }));

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
      setUserToken(null);
      setUser(null);
    } else if (role === 'vendor') {
      localStorage.removeItem('vendor_token');
      localStorage.removeItem('vendor');
      setVendorToken(null);
      setVendor(null);
    } else if (role === 'admin') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin');
      setAdminToken(null);
      setAdmin(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, vendor, admin,
      userToken, vendorToken, adminToken,
      loading,
      setAuth, logout,
      setUser, setVendor, setAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};
