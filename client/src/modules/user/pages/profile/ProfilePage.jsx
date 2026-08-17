import { useState, useRef } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { updateProfile } from '../../../../services/api/authApi';
import Button from '../../../../components/common/Button';
import Input from '../../../../components/common/Input';
import PageHeader from '../../../../components/common/PageHeader';
import ImageUpload from '../../../../components/common/ImageUpload';

const ProfilePage = () => {
  const { user, setUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    city: user?.city || '',
    city: user?.city || ''
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('phone', formData.phone);
      data.append('city', formData.city);
      
      // If user uploaded a new compressed file
      if (avatarFile) {
        data.append('avatar', avatarFile);
      } else if (avatarFile === null && !user?.avatar) {
         // It means they removed it, but we handle that if they explicitly remove it.
         // Actually, if we want to remove the existing photo, we send empty string.
         // Let's check if the user had an avatar, but they cleared it.
         // To track removal, we can add a flag, but ImageUpload passes null when removed.
      }

      // To cleanly handle removal:
      if (avatarFile === null && formData.avatarRemoved) {
        data.append('avatar', ''); // Explicitly remove
      }

      const res = await updateProfile(data);
      setUser(res.data.data);
      localStorage.setItem('user', JSON.stringify(res.data.data));
      setMessage('Profile updated successfully!');
      setEditing(false);
      setAvatarFile(null); // Reset after save
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setMessage(e.response?.data?.message || 'Update failed');
    }
    setSaving(false);
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
        {editing ? (
          <ImageUpload 
            currentImage={user?.avatar} 
            onFileSelect={(file) => {
              if (file === null) {
                 setFormData({...formData, avatarRemoved: true});
                 setAvatarFile(null);
              } else {
                 setAvatarFile(file);
                 setFormData({...formData, avatarRemoved: false});
              }
            }} 
            label=""
            isAvatar={true}
          />
        ) : (
          <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-primary-400 to-accent-400 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg overflow-hidden border-4 border-surface">
            {user?.avatar ? (
              <img src={user.avatar.startsWith('data:') ? user.avatar : `/uploads/${user.avatar}`} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
        )}
        <h2 className="text-[20px] font-headline-sm font-bold mt-4 text-on-surface">{user?.name}</h2>
        <p className="text-muted-text text-[14px] font-body-sm">{user?.email}</p>
      </div>

      {/* Profile Form */}
      <div className="bg-surface rounded-[24px] p-6 border border-border space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-headline-sm text-[18px] font-semibold text-on-surface">Personal Information</h3>
          <Button variant="ghost" size="sm" onClick={() => {
            setEditing(!editing);
            setFormData({ name: user?.name || '', phone: user?.phone || '', city: user?.city || '' });
            setAvatarFile(null);
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


    </div>
  );
};

export default ProfilePage;
