import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../services/adminApi';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';

const ProfilePage = () => {
  const { admin, setAdmin } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
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
  const desktopFileInputRef = useRef(null);

  useEffect(() => {
    if (admin) {
      setFormData({
        name: admin.name || '',
        phone: admin.phone || '',
        city: admin.city || ''
      });
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
    setImageFile('REMOVE');
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (desktopFileInputRef.current) desktopFileInputRef.current.value = '';
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      name: admin?.name || '',
      phone: admin?.phone || '',
      city: admin?.city || ''
    });
    setImageFile(null);
    setPreviewUrl(admin?.avatar ? getImageUrl(admin.avatar) : null);
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
        setAdmin(res.data.data);
        setImageFile(null);
        if (res.data.data.avatar) {
          setPreviewUrl(getImageUrl(res.data.data.avatar));
        } else {
          setPreviewUrl(null);
        }
        setIsEditing(false);
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Mobile Form View (Unchanged layout for < lg)
  const mobileView = (
    <div className="lg:hidden max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface">Admin Profile</h1>
        <p className="font-body-md text-muted-text mt-1">Manage your personal information and preferences.</p>
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">Full Name <span className="text-error">*</span></label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-[14px] outline-none transition-all" placeholder="Enter your full name" />
            </div>
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">Email Address</label>
              <input type="email" value={admin?.email || ''} readOnly disabled className="w-full bg-surface-variant/50 border border-border text-muted-text rounded-xl py-2.5 px-4 text-[14px] outline-none cursor-not-allowed" title="Email address cannot be changed directly" />
              <p className="text-[11px] text-muted-text mt-1">Email cannot be changed directly for security reasons.</p>
            </div>
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-[14px] outline-none transition-all" placeholder="Enter phone number" />
            </div>
            <div className="space-y-2">
              <label className="block text-[13px] font-medium text-on-surface">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-[14px] outline-none transition-all" placeholder="Enter city" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary hover:bg-primary-600 text-white font-medium rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
              ) : (
                <><span className="material-symbols-outlined text-[18px]">save</span>Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Desktop View (Brand new modern layout for >= lg)
  const desktopView = (
    <div className="hidden lg:block max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Top Banner / Header */}
      <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            {previewUrl ? (
              <img src={previewUrl} alt="Admin Profile" className="w-24 h-24 rounded-full object-cover border-4 border-surface shadow-sm" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-4 border-surface shadow-sm">
                {admin?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
            )}
            {isEditing && (
              <button onClick={() => desktopFileInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-surface border border-border rounded-full flex items-center justify-center text-primary shadow-sm hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              </button>
            )}
            <input type="file" ref={desktopFileInputRef} onChange={handleImageChange} accept="image/jpeg, image/png, image/webp" className="hidden" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{admin?.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-lg uppercase tracking-wide">
                Super Admin
              </span>
              <span className="text-sm text-muted-text flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">mail</span>
                {admin?.email}
              </span>
            </div>
          </div>
        </div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="px-5 py-2.5 bg-surface-variant hover:bg-surface-variant-hover text-on-surface font-semibold rounded-xl flex items-center gap-2 transition-colors border border-border">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Quick Actions & Security */}
        <div className="col-span-4 space-y-6">
          <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="font-semibold text-on-surface text-lg mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">shield_person</span>
              Account Security
            </h3>
            <p className="text-sm text-muted-text mb-4">
              Your account is secured with a password. To change your password, please use the dedicated security settings or reset flow.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-on-surface p-3 bg-background-alt rounded-xl border border-border">
                <span className="material-symbols-outlined text-success">verified_user</span>
                <span>Active Administrator</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account Details or Edit Form */}
        <div className="col-span-8">
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-border bg-background-alt/30">
              <h3 className="font-semibold text-on-surface text-lg">Personal Information</h3>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Full Name <span className="text-error">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Email Address</label>
                    <input type="email" value={admin?.email || ''} readOnly disabled className="w-full bg-surface-variant/50 border border-border text-muted-text rounded-xl py-2.5 px-4 text-sm outline-none cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Phone Number</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">City</label>
                    <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border flex items-center justify-end gap-3">
                  <button type="button" onClick={handleCancel} disabled={loading} className="px-5 py-2.5 text-on-surface hover:bg-surface-variant font-medium rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm">
                    {loading ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8">
                <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-[15px] text-on-surface font-medium">{admin?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Email Address</p>
                    <p className="text-[15px] text-on-surface font-medium">{admin?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="text-[15px] text-on-surface font-medium">{admin?.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">City / Location</p>
                    <p className="text-[15px] text-on-surface font-medium">{admin?.city || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileView}
      {desktopView}
    </>
  );
};

export default ProfilePage;
