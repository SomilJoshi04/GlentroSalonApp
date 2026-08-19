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
      // User is logged in, extract location from user profile
      if (user.location && user.location.coordinates && user.location.coordinates.length === 2) {
        setSelectedLocation({
          formattedAddress: user.formattedAddress || user.city || 'Saved Location',
          city: user.city || '',
          lat: user.location.coordinates[1],
          lng: user.location.coordinates[0],
        });
      } else if (user.city) {
        setSelectedLocation({ name: user.city, city: user.city });
      }
    } else {
      // User logged out, fallback to guest location
      try {
        const saved = localStorage.getItem('guest_location');
        setSelectedLocation(saved ? JSON.parse(saved) : null);
      } catch (e) {
        setSelectedLocation(null);
      }
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
    } else {
      // Save to localStorage for guest
      localStorage.setItem('guest_location', JSON.stringify(normalizedLocation));
      return true;
    }
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
