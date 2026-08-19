import { useEffect } from 'react';
import { useLocationContext } from '../../context/LocationContext';
import Button from './Button';

const LocationPermissionModal = ({ isOpen, onSelectManually, onClose }) => {
  const { 
    requestCurrentLocation, 
    isLocating, 
    locationError, 
    setLocationError,
    selectedLocation 
  } = useLocationContext();

  // If a valid location magically appears (e.g. from context sync), close modal
  useEffect(() => {
    if (isOpen && selectedLocation) {
      onClose();
    }
  }, [selectedLocation, isOpen, onClose]);

  // Reset errors when modal is opened
  useEffect(() => {
    if (isOpen) {
      setLocationError(null);
    }
  }, [isOpen, setLocationError]);

  const handleUseCurrentLocation = async () => {
    const success = await requestCurrentLocation();
    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-scale-in flex flex-col items-center text-center">
        
        {/* Close Button (X) */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-text hover:bg-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-soft-primary flex items-center justify-center text-primary mb-4 shadow-sm border border-primary/10">
          <span className="material-symbols-outlined text-[32px]" style={{fontVariationSettings: "'FILL' 1"}}>my_location</span>
        </div>

        {/* Title */}
        <h2 className="font-headline-sm text-2xl font-bold text-on-surface mb-2">
          Enable Location
        </h2>

        {/* Description / Error State */}
        {locationError ? (
          <p className="font-body-sm text-error mb-6 px-2">
            {locationError}
          </p>
        ) : (
          <p className="font-body-sm text-muted-text mb-6 px-2">
            Allow location access to discover the best salons and services near you.
          </p>
        )}

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={handleUseCurrentLocation}
            loading={isLocating}
            className="w-full rounded-xl py-3.5 shadow-sm"
          >
            {locationError ? 'Try Again' : 'Use My Current Location'}
          </Button>
          
          <Button
            variant="outline"
            onClick={onSelectManually}
            disabled={isLocating}
            className="w-full rounded-xl py-3.5 border-border text-on-surface hover:bg-surface-variant"
          >
            Select Location Manually
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionModal;
