import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { useLocationContext } from '../../context/LocationContext';
import Loader from './Loader';

// Libraries array must be statically defined to prevent re-renders
const libraries = ['places'];

// Map container style to fill flexible space
const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
};

// Default center (India/Fallback)
const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const defaultZoom = 5;
const detailZoom = 15;

const LocationSelectionModal = ({ isOpen, onClose }) => {
  const { setLocation, selectedLocation } = useLocationContext();

  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  const [markerPosition, setMarkerPosition] = useState(null);
  const [resolvedAddress, setResolvedAddress] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fallback OSM States
  const [osmQuery, setOsmQuery] = useState('');
  const [osmSuggestions, setOsmSuggestions] = useState([]);
  const [isOsmSearching, setIsOsmSearching] = useState(false);

  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const isDummyKey = !apiKey || apiKey.includes('YOUR_API_KEY');

  // Load Google Maps API
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  // Initialize map with current context location if available
  useEffect(() => {
    if (isOpen && selectedLocation?.lat && selectedLocation?.lng) {
      const pos = { lat: selectedLocation.lat, lng: selectedLocation.lng };
      setMapCenter(pos);
      setMarkerPosition(pos);
      setMapZoom(detailZoom);
      setResolvedAddress(selectedLocation);
    }
  }, [isOpen, selectedLocation]);

  // Fallback OSM Search
  useEffect(() => {
    if (!isDummyKey || osmQuery.length < 3) {
      setOsmSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsOsmSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(osmQuery)}&format=json&addressdetails=1&limit=5`);
        const data = await res.json();
        setOsmSuggestions(data);
      } catch (err) {
        console.error("OSM Search failed", err);
      } finally {
        setIsOsmSearching(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [osmQuery, isDummyKey]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  // Helper: Extract Address Components
  const extractLocationData = (place, lat, lng) => {
    let formattedAddress = place.formatted_address || "Selected Location";
    let city = '';
    let locality = '';
    let state = '';
    let country = '';
    let pincode = '';

    if (place.address_components) {
      place.address_components.forEach((comp) => {
        const types = comp.types;
        if (types.includes("locality")) city = comp.long_name;
        if (!city && types.includes("administrative_area_level_2")) city = comp.long_name;
        if (types.includes("sublocality") || types.includes("neighborhood")) locality = comp.long_name;
        if (types.includes("administrative_area_level_1")) state = comp.long_name;
        if (types.includes("country")) country = comp.long_name;
        if (types.includes("postal_code")) pincode = comp.long_name;
      });
    }

    if (!place.formatted_address && locality && city) {
      formattedAddress = `${locality}, ${city}`;
    }

    return { formattedAddress, city, locality, state, country, pincode, lat, lng };
  };

  // Helper: Reverse Geocode via Coordinates
  const geocodeCoordinates = async (lat, lng) => {
    setIsGeocoding(true);
    setErrorMsg('');
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results && response.results.length > 0) {
        const place = response.results[0];
        const locationData = extractLocationData(place, lat, lng);
        setResolvedAddress(locationData);
      } else {
        setResolvedAddress({ formattedAddress: 'Unknown Location', lat, lng, city: '' });
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
      setErrorMsg("Failed to resolve address. Please try again.");
      setResolvedAddress({ formattedAddress: 'Coordinates Selected', lat, lng, city: '' });
    } finally {
      setIsGeocoding(false);
    }
  };

  // Event: Autocomplete Place Selected
  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const pos = { lat, lng };
        
        setMapCenter(pos);
        setMarkerPosition(pos);
        setMapZoom(detailZoom);
        
        const locationData = extractLocationData(place, lat, lng);
        setResolvedAddress(locationData);
      }
    }
  };

  // Event: Map Clicked
  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarkerPosition({ lat, lng });
    setMapCenter({ lat, lng });
    geocodeCoordinates(lat, lng);
  };

  // Event: Use Current Location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      return;
    }

    setIsGeocoding(true);
    setErrorMsg('');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const pos = { lat, lng };
        
        setMapCenter(pos);
        setMarkerPosition(pos);
        setMapZoom(detailZoom);
        
        geocodeCoordinates(lat, lng);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsGeocoding(false);
        if (error.code === 1) setErrorMsg("Location permission denied.");
        else if (error.code === 2) setErrorMsg("Location unavailable.");
        else setErrorMsg("Location request timed out.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = async () => {
    if (!resolvedAddress || !resolvedAddress.lat) return;
    
    const success = await setLocation(resolvedAddress);
    if (success) {
      onClose();
    } else {
      setErrorMsg("Failed to save location");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-slide-up">
      {/* Header */}
      <header className="flex-none w-full bg-background shadow-sm flex justify-between items-center px-4 h-16 z-20">
        <button 
          onClick={onClose}
          className="text-primary hover:bg-soft-primary transition-colors active:scale-95 duration-150 p-2 -ml-2 rounded-full flex items-center justify-center"
        >
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>arrow_back</span>
        </button>
        <h1 className="font-headline-sm text-[20px] text-primary flex-1 text-center pr-8">Select Location</h1>
      </header>

      {/* Controls Container */}
      <div className="flex-none p-4 space-y-3 bg-surface z-10 shadow-sm relative">
        {isDummyKey && (
          <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl mb-3">
            <p className="text-warning font-body-sm text-center">Using fallback mode. Please configure your Google Maps API Key in .env for full map functionality.</p>
          </div>
        )}

        {(loadError) && !isDummyKey && (
          <div className="p-3 bg-error/10 border border-error/20 rounded-xl mb-3">
            <p className="text-error font-body-sm text-center">Map failed to load. Please check your connection or API key.</p>
          </div>
        )}

        {isLoaded && !loadError && !isDummyKey ? (
          <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-text">search</span>
              <input 
                type="text"
                placeholder="Search city, locality, or landmark"
                className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3.5 pl-12 pr-4 font-body-md text-on-surface placeholder-muted-text shadow-sm transition-all"
              />
            </div>
          </Autocomplete>
        ) : isDummyKey ? (
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-[18px] text-muted-text">travel_explore</span>
            <input 
              type="text"
              placeholder="Search city or locality (Free Fallback)"
              value={osmQuery}
              onChange={(e) => setOsmQuery(e.target.value)}
              className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3.5 pl-12 pr-4 font-body-md text-on-surface placeholder-muted-text shadow-sm transition-all"
            />
            {isOsmSearching && <span className="absolute right-4 top-[18px] w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>}
            
            {osmSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-xl shadow-lg border border-border overflow-hidden z-50 max-h-60 overflow-y-auto">
                {osmSuggestions.map((place, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const lat = parseFloat(place.lat);
                      const lng = parseFloat(place.lon);
                      const city = place.address?.city || place.address?.town || place.address?.state_district || place.name;
                      setResolvedAddress({
                        formattedAddress: place.display_name,
                        city: city,
                        lat: lat,
                        lng: lng
                      });
                      setMapCenter({ lat, lng });
                      setMarkerPosition({ lat, lng });
                      setOsmSuggestions([]);
                      setOsmQuery(place.display_name);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-surface-variant transition-colors border-b border-border/50 last:border-0 flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-muted-text mt-0.5">location_on</span>
                    <div>
                      <p className="font-headline-sm text-[14px] text-on-surface">{place.name}</p>
                      <p className="font-body-sm text-[12px] text-muted-text line-clamp-1">{place.display_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-[52px] bg-background-alt rounded-xl animate-pulse"></div>
        )}

        <button 
          onClick={handleCurrentLocation}
          disabled={isGeocoding || (!isLoaded && !isDummyKey)}
          className="w-full flex items-center justify-center gap-3 bg-soft-primary hover:bg-primary/20 transition-colors py-3.5 rounded-xl border border-primary/30 group shadow-sm active:scale-[0.98] duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isGeocoding && !markerPosition ? (
            <Loader size="sm" text="Locating..." />
          ) : (
            <>
              <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>my_location</span>
              <span className="font-label-md text-[14px] text-primary">Use Current Location</span>
            </>
          )}
        </button>
        
        {errorMsg && (
          <p className="text-error font-body-sm mt-2 text-center">{errorMsg}</p>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative p-4 pb-0 bg-surface-variant">
        {isDummyKey ? (
           <div className="w-full h-full rounded-t-2xl bg-surface-container flex flex-col items-center justify-center text-muted-text gap-3 border border-border/50 border-b-0">
             <span className="material-symbols-outlined text-6xl opacity-50">map</span>
             <p className="font-body-md text-center max-w-[80%]">Map visualization is disabled because a valid Google Maps API key was not found.</p>
           </div>
        ) : !isLoaded ? (
          <div className="w-full h-full rounded-t-2xl bg-surface-container-highest animate-pulse flex flex-col items-center justify-center text-muted-text gap-2">
            <span className="material-symbols-outlined text-4xl animate-bounce">location_on</span>
            <p className="font-label-md">Loading Map...</p>
          </div>
        ) : (
          <div className="w-full h-full rounded-t-2xl overflow-hidden shadow-inner border border-border/50 border-b-0">
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={mapZoom}
              center={mapCenter}
              onLoad={onMapLoad}
              onUnmount={onMapUnmount}
              onClick={handleMapClick}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                clickableIcons: false,
              }}
            >
              {markerPosition && (
                <Marker 
                  position={markerPosition} 
                  animation={window.google.maps.Animation.DROP}
                />
              )}
            </GoogleMap>
          </div>
        )}

        {/* Floating Address Card overlay */}
        {resolvedAddress && (
          <div className="absolute bottom-6 left-6 right-6 bg-surface p-4 rounded-xl shadow-lg border border-border flex items-start gap-3 animate-slide-up">
            <div className="bg-soft-primary p-2 rounded-full text-primary shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]" style={{fontVariationSettings: "'FILL' 1"}}>location_on</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-headline-sm text-[16px] text-on-surface truncate">Selected Location</h3>
              <p className="font-body-sm text-[14px] text-muted-text line-clamp-2 mt-0.5">{resolvedAddress.formattedAddress}</p>
              {isGeocoding && <p className="text-[11px] text-primary mt-1 animate-pulse">Resolving details...</p>}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Confirm Button */}
      <div className="flex-none p-4 bg-surface border-t border-border z-20 pb-safe">
        <button
          onClick={handleConfirm}
          disabled={!resolvedAddress || isGeocoding || !resolvedAddress.lat}
          className="w-full py-4 rounded-xl font-label-lg text-white bg-primary hover:bg-primary-600 disabled:bg-surface-variant disabled:text-muted-text disabled:border-border transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          Confirm Location
        </button>
      </div>
    </div>
  );
};

export default LocationSelectionModal;
