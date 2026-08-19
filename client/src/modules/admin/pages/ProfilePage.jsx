import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../services/adminApi';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';

const ProfilePage = () => {
  const { admin, setAdmin, adminToken } = useAuth();
  
  const [formData, setFormData] = useState({
    name: admin?.name || '',
    phone: admin?.phone || '',
    city: admin?.city || ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    admin?.avatar ? getImageUrl(admin.avatar) : null
  );
  
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Sync global auth state to local form state on mount or when another tab/process updates admin
  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        phone: admin.phone || '',
        city: admin.city || ''
      });
      // Only sync image if the user hasn't explicitly selected a new local file yet
      if (!imageFile && imageFile !== 'REMOVE') {
        setPreviewUrl(admin.avatar ? getImageUrl(admin.avatar) : null);
      }
    }
  }, [admin, imageFile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }

    try {
      // Compress image
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      setImageFile(compressedFile);
      setPreviewUrl(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Failed to process image');
    }
  };

  const removeImage = () => {
    setImageFile('REMOVE'); // Special flag to tell backend to remove
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setLoading(true);
      const data = new FormData();
      data.append('name', formData.name);
      data.append('phone', formData.phone);
      data.append('city', formData.city);
      
      if (imageFile === 'REMOVE') {
        data.append('avatar', '');
      } else if (imageFile) {
        data.append('avatar', imageFile, imageFile.name || 'avatar.webp');
      }

      const res = await updateProfile(data);
      if (res.data?.success) {
        // Update global auth state to trigger UI updates instantly
        setAdmin(res.data.data);
        
        // Reset local temporary state and force canonical URL
        setImageFile(null);
        if (res.data.data.avatar) {
          setPreviewUrl(getImageUrl(res.data.data.avatar));
        } else {
          setPreviewUrl(null);
        }
        
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface">Admin Profile</h1>
        <p className="font-body-md text-muted-text mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
          
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="relative">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Profile Preview" 
                  onError={(e) => { e.target.onerror = null; setPreviewUrl(null); }}
                  className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-sm"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-[32px] font-bold border-4 border-surface shadow-sm">
                  {formData.name.charAt(0).toUpperCase() || 'A'}
                </div>
              )}
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-surface-variant hover:bg-surface-variant-hover rounded-full flex items-center justify-center text-primary shadow-sm border border-border transition-colors"
                title="Change Photo"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>
            
            <div>
              <h3 className="font-headline-sm text-[16px] text-on-surface mb-1">Profile Photo</h3>
              <p className="text-[13px] text-muted-text mb-3">JPG, PNG or WebP. Max size of 1MB.</p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-surface-variant hover:bg-surface-variant-hover text-on-surface font-medium rounded-xl transition-colors text-[13px]"
                >
                  Upload New
                </button>
                {previewUrl && (
                  <button 
                    type="button"
                    onClick={removeImage}
                    className="px-4 py-2 bg-error/10 hover:bg-error/20 text-error font-medium rounded-xl transition-colors text-[13px]"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
              />
            </div>
          </div>

          <hr className="border-border" />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">
                Full Name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-[14px] outline-none transition-all"
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">
                Email Address
              </label>
              <input
                type="email"
                value={admin?.email || ''}
                readOnly
                disabled
                className="w-full bg-surface-variant/50 border border-border text-muted-text rounded-xl py-2.5 px-4 text-[14px] outline-none cursor-not-allowed"
                title="Email address cannot be changed directly"
              />
              <p className="text-[11px] text-muted-text mt-1">Email cannot be changed directly for security reasons.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-[14px] outline-none transition-all"
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-[14px] outline-none transition-all"
                placeholder="Enter city"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary hover:bg-primary-600 text-white font-medium rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
