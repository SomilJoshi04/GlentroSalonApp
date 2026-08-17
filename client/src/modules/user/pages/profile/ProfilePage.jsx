import { useState, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { updateProfile } from '../../../../services/api/authApi';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import PageHeader from '../../../../components/common/PageHeader';

const ProfilePage = () => {
  const { user, setUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    city: user?.city || '',
    avatar: user?.avatar || ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfile(formData);
      setUser(res.data.data);
      // Optionally update local storage if needed, but context is enough
      localStorage.setItem('user', JSON.stringify(res.data.data));
      setMessage('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Update failed');
    }
    setSaving(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatar: reader.result });
        setShowPhotoModal(false);
        // Automatically save when photo is changed
        setEditing(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setFormData({ ...formData, avatar: '' });
    setShowPhotoModal(false);
    setEditing(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 animate-fade-in pb-10">
      <PageHeader title="My Profile" />
      <h1 className="hidden md:block font-headline-xl text-[32px] font-bold text-on-surface">My Profile</h1>

      {message && (
        <div className="px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">{message}</div>
      )}

      {/* Avatar Section */}
      <div className="flex flex-col items-center bg-surface rounded-[24px] p-8 border border-border">
        <div className="relative cursor-pointer group" onClick={() => setShowPhotoModal(true)}>
          <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden border-4 border-surface">
            {formData.avatar ? (
              <img src={formData.avatar.startsWith('data:') ? formData.avatar : `/uploads/${formData.avatar}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <div className="absolute bottom-0 right-0 bg-primary w-8 h-8 rounded-full flex items-center justify-center border-2 border-surface shadow-md group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
          </div>
        </div>
        <h2 className="text-[20px] font-headline-sm font-bold mt-4 text-on-surface">{user?.name}</h2>
        <p className="text-muted-text text-[14px] font-body-sm">{user?.email}</p>
      </div>

      {/* Profile Form */}
      <div className="bg-surface rounded-[24px] p-6 border border-border space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-sm text-[18px] font-semibold text-on-surface">Personal Information</h3>
          <Button variant="ghost" size="sm" onClick={() => {
            setEditing(!editing);
            setFormData({ name: user?.name || '', phone: user?.phone || '', city: user?.city || '', avatar: user?.avatar || '' });
          }}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <Input label="Name" name="name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <Input label="Phone" name="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="City" name="city" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
            <Button onClick={handleSave} loading={saving} className="w-full mt-2">Save Changes</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b border-border/50">
              <span className="text-[14px] font-body-sm text-muted-text">Name</span><span className="text-[14px] font-body-md font-medium text-on-surface">{user?.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border/50">
              <span className="text-[14px] font-body-sm text-muted-text">Email</span><span className="text-[14px] font-body-md font-medium text-on-surface">{user?.email}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border/50">
              <span className="text-[14px] font-body-sm text-muted-text">Phone</span><span className="text-[14px] font-body-md font-medium text-on-surface">{user?.phone}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-[14px] font-body-sm text-muted-text">City</span><span className="text-[14px] font-body-md font-medium text-on-surface">{user?.city || 'Not set'}</span>
            </div>
          </div>
        )}
      </div>

      <Button variant="danger" onClick={logout} className="w-full">Logout</Button>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-surface w-full max-w-sm rounded-[24px] p-6 animate-slide-up space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-headline-sm text-[20px] font-bold text-on-surface">Profile Photo</h3>
              <button onClick={() => setShowPhotoModal(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              accept="image/*" 
              className="hidden" 
            />

            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-surface-variant transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">photo_library</span>
              </div>
              <span className="font-body-md font-medium text-on-surface">Choose from Gallery</span>
            </button>

            {formData.avatar && (
              <button 
                onClick={removePhoto}
                className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-error/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined">delete</span>
                </div>
                <span className="font-body-md font-medium text-error">Remove Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
