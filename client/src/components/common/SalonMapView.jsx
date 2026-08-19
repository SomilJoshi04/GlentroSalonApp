import { useState, useCallback, useRef, useEffect } from 'react';
import { useLoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import Loader from './Loader';
import { getImageUrl } from '../../utils/imageUtils';

const libraries = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
};

// Fallback center if everything else fails
const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const SalonMapView = ({ salons, centerLocation, onMapMove }) => {
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedSalon, setSelectedSalon] = useState(null);
  
  const mapRef = useRef(null);
  const dragTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  // Initialize map center
  useEffect(() => {
    if (centerLocation && centerLocation.lat && centerLocation.lng) {
      setMapCenter({ lat: parseFloat(centerLocation.lat), lng: parseFloat(centerLocation.lng) });
    } else if (salons.length > 0 && salons[0].location?.coordinates) {
      setMapCenter({ lat: salons[0].location.coordinates[1], lng: salons[0].location.coordinates[0] });
    }
  }, [centerLocation]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleDragEnd = () => {
    if (!mapRef.current || !onMapMove) return;
    
    // Clear previous timeout if user drags again quickly
    if (dragTimeoutRef.current) {
      clearTimeout(dragTimeoutRef.current);
    }
    
    // Debounce the map move action
    dragTimeoutRef.current = setTimeout(() => {
      const newCenter = mapRef.current.getCenter();
      if (newCenter) {
        const lat = newCenter.lat();
        const lng = newCenter.lng();
        onMapMove(lat, lng);
      }
    }, 600); // 600ms debounce
  };

  const getSalonPrice = (salon) => {
    if (salon.minServicePrice !== undefined && salon.minServicePrice !== null) {
      return salon.minServicePrice;
    }
    return null;
  };

  if (loadError) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-red-50 text-red-600 rounded-2xl border border-red-200">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl mb-2">error</span>
          <p>Map failed to load.</p>
          <p className="text-sm mt-1 opacity-80">Please check your connection or API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center bg-surface-variant rounded-2xl animate-pulse">
        <div className="text-center text-muted-text">
          <span className="material-symbols-outlined text-4xl mb-2 animate-bounce">location_on</span>
          <p>Loading Map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] relative rounded-2xl overflow-hidden border border-border shadow-sm">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={14}
        center={mapCenter}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        onDragEnd={handleDragEnd}
        onZoomChanged={handleDragEnd}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
        {/* User Location Marker (Blue dot or custom marker) */}
        {centerLocation && centerLocation.lat && (
          <Marker
            position={{ lat: parseFloat(centerLocation.lat), lng: parseFloat(centerLocation.lng) }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
              scale: 8,
            }}
            title="Your Location"
            zIndex={100}
          />
        )}

        {/* Salon Markers */}
        {salons.map(salon => {
          // Skip salons without valid coordinates
          if (!salon.location?.coordinates || salon.location.coordinates.length < 2) return null;
          
          const lat = salon.location.coordinates[1];
          const lng = salon.location.coordinates[0];
          
          // Basic validation to avoid 0,0 if it's considered invalid for a salon
          if (lat === 0 && lng === 0) return null;

          return (
            <Marker
              key={salon._id}
              position={{ lat, lng }}
              onClick={() => setSelectedSalon(salon)}
              animation={window.google.maps.Animation.DROP}
            />
          );
        })}

        {/* InfoWindow for Selected Salon */}
        {selectedSalon && selectedSalon.location?.coordinates && (
          <InfoWindow
            position={{ 
              lat: selectedSalon.location.coordinates[1], 
              lng: selectedSalon.location.coordinates[0] 
            }}
            onCloseClick={() => setSelectedSalon(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -30) }}
          >
            <div className="p-1 max-w-[200px] flex flex-col gap-2">
              <div className="h-24 w-full rounded-lg overflow-hidden bg-surface-variant">
                <img 
                  src={selectedSalon.images?.[0] ? getImageUrl(selectedSalon.images[0]) : "https://images.unsplash.com/photo-1521590832167-7bfcfaa6362f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"} 
                  alt={selectedSalon.name} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-headline-sm text-[16px] text-on-surface line-clamp-1">{selectedSalon.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-[14px] text-rating" style={{fontVariationSettings: "'FILL' 1"}}>star</span>
                  <span className="font-label-sm text-[12px] text-on-surface font-bold">{selectedSalon.ratings?.average > 0 ? selectedSalon.ratings.average.toFixed(1) : 'New'}</span>
                  <span className="text-muted-text text-[11px] ml-1">({selectedSalon.ratings?.count || 0})</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-1">
                {getSalonPrice(selectedSalon) !== null ? (
                  <span className="font-label-sm text-[13px] text-primary">Starting ₹{getSalonPrice(selectedSalon)}</span>
                ) : (
                  <span className="font-label-sm text-[12px] text-muted-text">Price N/A</span>
                )}
                {selectedSalon.distance && (
                  <span className="text-[11px] text-muted-text bg-surface-variant px-1.5 py-0.5 rounded">{selectedSalon.distance}</span>
                )}
              </div>
              
              <button 
                onClick={() => navigate(`/salon/${selectedSalon._id}`)}
                className="w-full mt-2 py-1.5 bg-primary text-white rounded-lg text-[12px] font-medium hover:bg-primary-dark transition-colors"
              >
                View Salon
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* "Use My Location" Overlay Button */}
      {centerLocation && centerLocation.lat && (
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.panTo({ lat: parseFloat(centerLocation.lat), lng: parseFloat(centerLocation.lng) });
              mapRef.current.setZoom(14);
            }
          }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface px-4 py-2 rounded-full shadow-lg border border-border flex items-center gap-2 text-primary font-label-md text-sm hover:bg-soft-primary transition-colors z-10"
        >
          <span className="material-symbols-outlined text-[18px]">my_location</span>
          Recenter
        </button>
      )}
    </div>
  );
};

export default SalonMapView;
