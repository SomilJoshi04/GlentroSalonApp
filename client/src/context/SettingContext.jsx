import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '../services/api/settingApi';
import { getImageUrl } from '../utils/imageUtils';

const SettingContext = createContext();

export const useSettings = () => useContext(SettingContext);

export const SettingProvider = ({ children }) => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      if (res.data?.success) {
        setSettings(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Update favicon and title dynamically
  useEffect(() => {
    if (settings.appLogo) {
      const favicon = document.getElementById('favicon');
      if (favicon) {
        favicon.href = getImageUrl(settings.appLogo);
      }
    }
    
    if (settings.appName) {
      document.title = settings.appName;
    } else {
      document.title = 'SalonBook';
    }
  }, [settings.appLogo, settings.appName]);

  return (
    <SettingContext.Provider value={{ settings, fetchSettings, loading }}>
      {children}
    </SettingContext.Provider>
  );
};
