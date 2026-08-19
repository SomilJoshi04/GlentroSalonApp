import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import Loader from './Loader';

const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '12px',
};

const defaultCenter = { lat: 20.5937, lng: 78.9629 };
const defaultZoom = 5;
const detailZoom = 15;

const LocationPicker = ({ initialLat, initialLng, initialAddress, onLocationSelect }) => {
  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(defaultZoom);
  
  const [searchQuery, setSearchQuery] = useState(initialAddress || '');
  const [searching, setSearching] = useState(false);
  
  const mapRef = useRef(null);
  const autocompleteRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  useEffect(() => {
    if (initialLat && initialLng) {
      const lat = parseFloat(initialLat);
      const lng = parseFloat(initialLng);
      setPosition({ lat, lng });
      setMapCenter({ lat, lng });
      setMapZoom(detailZoom);
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (initialAddress) {
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const onAutocompleteLoad = useCallback((autocomplete) => {
    autocompleteRef.current = autocomplete;
  }, []);

  const geocodeCoordinates = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      
      if (response.results && response.results.length > 0) {
        const place = response.results[0];
        setSearchQuery(place.formatted_address);
        onLocationSelect(lat, lng, place.formatted_address);
      } else {
        onLocationSelect(lat, lng, searchQuery);
      }
    } catch (err) {
      console.error('Error reverse geocoding:', err);
      onLocationSelect(lat, lng, searchQuery);
    }
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setMapCenter({ lat, lng });
        setPosition({ lat, lng });
        setMapZoom(detailZoom);
        
        const address = place.formatted_address || place.name;
        setSearchQuery(address);
        onLocationSelect(lat, lng, address);
      }
    }
  };

  const handleMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosition({ lat, lng });
    geocodeCoordinates(lat, lng);
  };

  const handleMarkerDragEnd = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPosition({ lat, lng });
    geocodeCoordinates(lat, lng);
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setPosition({ lat, lng });
          setMapCenter({ lat, lng });
          setMapZoom(detailZoom);
          geocodeCoordinates(lat, lng);
          setSearching(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not access your location. Please check browser permissions.');
          setSearching(false);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (loadError) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-xl">Map failed to load. Please check your connection or API key.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          {isLoaded ? (
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search address or location..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); } }}
                />
              </div>
            </Autocomplete>
          ) : (
            <input 
              type="text" 
              value={searchQuery}
              readOnly
              placeholder="Loading search..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 cursor-not-allowed"
            />
          )}
        </div>
        <button 
          type="button" 
          onClick={useCurrentLocation}
          disabled={searching}
          className="px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 justify-center shrink-0 disabled:opacity-50"
        >
          {searching ? <Loader size="sm" /> : <span className="material-symbols-outlined text-[18px]">my_location</span>}
          Current Location
        </button>
      </div>
      
      <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0 bg-slate-100">
        {!isLoaded ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined animate-bounce text-3xl">location_on</span>
            <span className="text-sm mt-2">Loading Map...</span>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={mapZoom}
            center={mapCenter}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            onClick={handleMapClick}
            options={{
              disableDefaultUI: false,
              zoomControl: true,
              clickableIcons: false,
              streetViewControl: false,
              mapTypeControl: false,
            }}
          >
            {position && (
              <Marker 
                position={position}
                draggable={true}
                onDragEnd={handleMarkerDragEnd}
                animation={window.google.maps.Animation.DROP}
              />
            )}
          </GoogleMap>
        )}
      </div>
      <p className="text-xs text-slate-500 italic">Click or drag the marker to pin your exact salon location.</p>
    </div>
  );
};

export default LocationPicker;
