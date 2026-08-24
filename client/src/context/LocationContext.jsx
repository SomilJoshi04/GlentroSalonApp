import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api/axiosInstance';

const LocationContext = createContext();

export const useLocationContext = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  
  // Initial state from localStorage for guests
  const [selectedLocation, setSelectedLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('guest_location');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Sync with Auth Context when user logs in/out
  useEffect(() => {
    if (isAuthenticated && user) {
      const isGuestUpdatedThisSession = sessionStorage.getItem('guest_location_updated') === 'true';

      if (isGuestUpdatedThisSession) {
        // The user intentionally updated location during this guest session, then logged in.
        // Sync this new location to the backend instead of overwriting it with stale backend data.
        try {
          const saved = localStorage.getItem('guest_location');
          if (saved) {
            const parsed = JSON.parse(saved);
            setSelectedLocation(parsed);
            
            // Sync to backend
            api.put('/users/location', {
              latitude: parsed.lat,
              longitude: parsed.lng,
              city: parsed.city,
              formattedAddress: parsed.formattedAddress,
            }).catch(e => console.error('Failed to sync guest location on login:', e));
          }
        } catch (e) {
          console.error('Error reading guest location:', e);
        }
      } else {
        // User is logged in and hasn't manually changed location this session.
        // Extract location from user profile.
        if (user.location && user.location.coordinates && user.location.coordinates.length === 2) {
          const loc = {
            formattedAddress: user.formattedAddress || user.city || 'Saved Location',
            city: user.city || '',
            lat: user.location.coordinates[1],
            lng: user.location.coordinates[0],
          };
          setSelectedLocation(loc);
          // Sync it back to local storage so logout falls back to the correct last known location
          localStorage.setItem('guest_location', JSON.stringify(loc));
        } else if (user.city) {
          const loc = { name: user.city, city: user.city };
          setSelectedLocation(loc);
          localStorage.setItem('guest_location', JSON.stringify(loc));
        }
      }
    } else {
      // User logged out (or is a guest), fallback to guest location
      try {
        const saved = localStorage.getItem('guest_location');
        setSelectedLocation(saved ? JSON.parse(saved) : null);
      } catch (e) {
        setSelectedLocation(null);
      }
      
      // On explicit logout (transition from auth to guest), we clear the session flag
      // so if they login again it doesn't think they manually set it as guest
      sessionStorage.removeItem('guest_location_updated');
    }
  }, [isAuthenticated, user]);

  /**
   * Set location and persist it (Backend or LocalStorage)
   */
  const setLocation = async (locationData) => {
    // Validations
    if (locationData.lat && (locationData.lat < -90 || locationData.lat > 90)) return false;
    if (locationData.lng && (locationData.lng < -180 || locationData.lng > 180)) return false;

    const normalizedLocation = {
      formattedAddress: locationData.formattedAddress || locationData.name || '',
      city: locationData.city || '',
      lat: locationData.lat,
      lng: locationData.lng,
    };

    setSelectedLocation(normalizedLocation);

    // ALWAYS save to localStorage so logout falls back to it gracefully
    localStorage.setItem('guest_location', JSON.stringify(normalizedLocation));
    
    // Set a session flag indicating the user explicitly set a location THIS session
    sessionStorage.setItem('guest_location_updated', 'true');

    if (isAuthenticated) {
      try {
        // Persist to backend
        await api.put('/users/location', {
          latitude: normalizedLocation.lat,
          longitude: normalizedLocation.lng,
          city: normalizedLocation.city,
          formattedAddress: normalizedLocation.formattedAddress,
        });
        return true;
      } catch (error) {
        console.error('Failed to save location to backend:', error);
        setLocationError('Unable to save location permanently.');
        return false;
      }
    }
    
    return true;
  };

  /**
   * Request GPS, reverse geocode, and set location
   */
  const requestCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser");
        setIsLocating(false);
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Call our backend reverse geocoding proxy
            const response = await api.get('/location/reverse', {
              params: { lat: latitude, lng: longitude }
            });
            
            if (response.data.success && response.data.data) {
              const success = await setLocation({
                formattedAddress: response.data.data.formattedAddress,
                city: response.data.data.city,
                lat: response.data.data.latitude,
                lng: response.data.data.longitude
              });
              setIsLocating(false);
              resolve(success);
            } else {
              throw new Error("Reverse geocoding failed");
            }
          } catch (error) {
            console.error("Reverse geocoding error:", error);
            // Fallback: use coordinates without formatted address if reverse geocoding fails
            const success = await setLocation({
              formattedAddress: "Current Location",
              lat: latitude,
              lng: longitude
            });
            setIsLocating(false);
            resolve(success);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          let errMsg = "Unable to detect your location. Please try again.";
          if (error.code === 1) errMsg = "Location access is turned off. Please allow location access in your browser settings to discover salons near you.";
          if (error.code === 2) errMsg = "Location position unavailable. Please try again or select manually.";
          if (error.code === 3) errMsg = "Location request timed out. Please try again or select manually.";
          setLocationError(errMsg);
          setIsLocating(false);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  return (
    <LocationContext.Provider value={{ 
      selectedLocation, 
      setLocation, 
      requestCurrentLocation, 
      isLocating, 
      locationError,
      setLocationError
    }}>
      {children}
    </LocationContext.Provider>
  );
};
