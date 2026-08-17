import React, { useRef, useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

const ImageUpload = ({ 
  onFileSelect, 
  currentImage, 
  label = 'Upload Image',
  className = '',
  maxSizeMB = 1,
  maxWidthOrHeight = 1920,
  isAvatar = false
}) => {
  const [preview, setPreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentImage) {
      // Handle either Base64 or URL paths
      setPreview(currentImage.startsWith('data:') || currentImage.startsWith('http') || currentImage.startsWith('blob:') ? currentImage : `/uploads/${currentImage}`);
    } else {
      setPreview('');
    }
  }, [currentImage]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    setCompressing(true);
    
    try {
      const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      
      // Pass the actual File object back to parent
      if (onFileSelect) {
        onFileSelect(compressedFile);
      } else {
        const previewUrl = URL.createObjectURL(compressedFile);
        setPreview(previewUrl);
      }
    } catch (err) {
      console.error('Image compression error:', err);
      setError('Failed to process image. Please try a different one.');
    } finally {
      setCompressing(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onFileSelect) onFileSelect(null);
  };

  const roundedClass = isAvatar ? 'rounded-full' : 'rounded-2xl';

  return (
    <div className={`space-y-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-text-secondary">{label}</label>}
      
      {error && <div className="text-error text-sm px-3 py-2 bg-error/10 rounded-xl">{error}</div>}
      
      <div className="flex items-center gap-4">
        {/* Preview Area */}
        {preview ? (
          <div className={`relative group w-24 h-24 overflow-hidden bg-surface-variant border border-border ${roundedClass}`}>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={handleRemove} className="text-white hover:text-error transition-colors" title="Remove">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`w-24 h-24 border-2 border-dashed border-border flex items-center justify-center text-muted-text hover:text-primary hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors ${roundedClass}`}
          >
            <span className="material-symbols-outlined text-[32px]">add_photo_alternate</span>
          </div>
        )}

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
            className="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-sm font-medium hover:bg-surface-elevated transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              {compressing ? 'hourglass_top' : 'upload'}
            </span>
            {compressing ? 'Compressing...' : (preview ? 'Change Image' : 'Select Image')}
          </button>
          
          <p className="text-[12px] text-muted-text">
            Supported formats: JPG, PNG, WebP.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
