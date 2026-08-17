import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle clicks/drags on the map
function MapInteraction({ position, setPosition, onLocationChange }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationChange(lat, lng);
    },
  });

  return position === null ? null : (
    <Marker 
      position={position} 
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
          onLocationChange(pos.lat, pos.lng);
        },
      }}
    />
  );
}

const LocationPicker = ({ initialLat, initialLng, initialAddress, onLocationSelect }) => {
  const [position, setPosition] = useState(
    initialLat && initialLng ? [parseFloat(initialLat), parseFloat(initialLng)] : [20.5937, 78.9629] // Default to India
  );
  const [address, setAddress] = useState(initialAddress || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Need a ref to the map to pan it manually
  const mapRef = useRef();

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([parseFloat(initialLat), parseFloat(initialLng)]);
    }
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
      setSearchQuery(initialAddress);
    }
  }, [initialAddress]);

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await response.json();
      if (data && data.display_name) {
        setAddress(data.display_name);
        setSearchQuery(data.display_name);
        onLocationSelect(lat, lng, data.display_name);
      } else {
        onLocationSelect(lat, lng, address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      onLocationSelect(lat, lng, address);
    }
  };

  const handleLocationChange = (lat, lng) => {
    reverseGeocode(lat, lng);
  };

  const searchAddress = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        const newLat = parseFloat(result.lat);
        const newLng = parseFloat(result.lon);
        setPosition([newLat, newLng]);
        setAddress(result.display_name);
        setSearchQuery(result.display_name);
        onLocationSelect(newLat, newLng, result.display_name);
        
        if (mapRef.current) {
          mapRef.current.setView([newLat, newLng], 15);
        }
      } else {
        alert('Address not found!');
      }
    } catch (error) {
      console.error('Error searching address:', error);
      alert('Error searching address');
    }
    setSearching(false);
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          reverseGeocode(latitude, longitude);
          
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Could not access your location. Please check browser permissions.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchAddress(e); } }}
            placeholder="Search address or location..."
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-primary-400"
          />
          <button 
            type="button" 
            onClick={searchAddress}
            disabled={searching}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors"
          >
            {searching ? '...' : 'Search'}
          </button>
        </div>
        <button 
          type="button" 
          onClick={useCurrentLocation}
          className="px-4 py-2 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 justify-center"
        >
          📍 Current Location
        </button>
      </div>
      
      <div className="h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
        <MapContainer 
          center={position} 
          zoom={initialLat ? 15 : 5} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapInteraction 
            position={position} 
            setPosition={setPosition} 
            onLocationChange={handleLocationChange} 
          />
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500 italic">Click or drag the marker to pin your exact salon location.</p>
    </div>
  );
};

export default LocationPicker;
