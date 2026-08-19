import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../services/vendorApi';
import ImageUpload from '../../../components/common/ImageUpload';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';

const ProfilePage = () => {
  const { vendor: user, setVendor: updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', businessName: user?.businessName || '', avatarRemoved: false });
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('phone', form.phone);
      data.append('businessName', form.businessName);
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      } else if (avatarFile === null && form.avatarRemoved) {
        data.append('avatar', '');
      }

      const r = await updateProfile(data); 
      updateUser(r.data.data); 
      setEditing(false); 
      setAvatarFile(null);
      toast.success('Profile updated successfully.');
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Changes could not be saved. Please try again.'); 
    }
    setSaving(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in pb-10">
      <div>
        <h1 className="font-headline-md text-[28px] text-on-surface font-bold text-center">Profile Settings</h1>
        <p className="font-body-md text-muted-text mt-1 text-center">Manage your personal and business credentials.</p>
      </div>

      <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm text-center">
        <div className="w-20 h-20 mx-auto bg-soft-primary rounded-full flex items-center justify-center text-primary text-3xl font-bold overflow-hidden border border-border">
          {user?.avatar ? (
            <img src={user.avatar.startsWith('data:') ? user.avatar : getImageUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            user?.name?.charAt(0).toUpperCase()
          )}
        </div>
        <h2 className="text-xl font-bold text-on-surface mt-4">{user?.name}</h2>
        <p className="text-muted-text text-sm mt-0.5">{user?.businessName}</p>
        <p className="text-muted-text text-xs mt-1">{user?.email}</p>
        <div className="mt-3.5 flex justify-center">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${user?.isApproved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
            <span className="material-symbols-outlined text-[16px]">{user?.isApproved ? 'check_circle' : 'pending'}</span>
            {user?.isApproved ? 'Approved Vendor' : 'Pending Verification'}
          </span>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border">
          <h3 className="font-semibold text-on-surface text-lg">Details</h3>
          <button onClick={() => setEditing(!editing)} className="text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">{editing ? 'close' : 'edit'}</span>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <div className="space-y-4">
            <div className="flex justify-center mb-6">
              <ImageUpload 
                currentImage={user?.avatar} 
                onFileSelect={(file) => {
                  if (file === null) {
                     setForm({...form, avatarRemoved: true});
                     setAvatarFile(null);
                  } else {
                     setAvatarFile(file);
                     setForm({...form, avatarRemoved: false});
                  }
                }} 
                label=""
                isAvatar={true}
              />
            </div>
            {[{n:'name',l:'Name'},{n:'phone',l:'Phone'},{n:'businessName',l:'Business Name'}].map(f => (
              <div key={f.n}>
                <label className="text-sm font-medium text-muted-text">{f.l}</label>
                <input value={form[f.n]} onChange={e => setForm({...form, [f.n]: e.target.value})} className="w-full mt-1 px-3 py-2.5 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary shadow-sm" />
              </div>
            ))}
            <button onClick={handleSave} disabled={saving} className="w-full py-2.5 mt-4 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">save</span>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {[['Name', user?.name],['Email', user?.email],['Phone', user?.phone],['Business', user?.businessName]].map(([l,v]) => (
              <div key={l} className="flex justify-between py-3 border-b border-border/50 text-on-surface">
                <span className="text-muted-text">{l}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default ProfilePage;
