import { useState, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { updateProfile } from '../services/vendorApi';
import ImageUpload from '../../../components/common/ImageUpload';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../../utils/imageUtils';

const ProfilePage = () => {
  const { vendor: user, setVendor: updateUser } = useAuth();
  
  // Mobile states
  const [editing, setEditing] = useState(false);
  
  // Desktop states
  const [desktopEditing, setDesktopEditing] = useState(false);
  
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    phone: user?.phone || '', 
    businessName: user?.businessName || '', 
    avatarRemoved: false 
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCancelDesktop = () => {
    setDesktopEditing(false);
    setForm({
      name: user?.name || '',
      phone: user?.phone || '',
      businessName: user?.businessName || '',
      avatarRemoved: false
    });
    setAvatarFile(null);
  };

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
      setDesktopEditing(false);
      setAvatarFile(null);
      toast.success('Profile updated successfully.');
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Changes could not be saved. Please try again.'); 
    }
    setSaving(false);
  };

  // -------------------------------------------------------------
  // MOBILE VIEW (< lg)
  // -------------------------------------------------------------
  const mobileView = (
    <div className="lg:hidden max-w-lg mx-auto space-y-6 animate-fade-in pb-10">
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

  // -------------------------------------------------------------
  // DESKTOP VIEW (>= lg)
  // -------------------------------------------------------------
  const desktopView = (
    <div className="hidden lg:block max-w-5xl mx-auto space-y-8 animate-fade-in pb-10">
      
      {/* Top Banner / Header */}
      <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-soft-primary rounded-full flex items-center justify-center text-primary text-3xl font-bold overflow-hidden border-4 border-surface shadow-sm">
              {user?.avatar ? (
                <img src={user.avatar.startsWith('data:') ? user.avatar : getImageUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-on-surface">{user?.businessName || user?.name}</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg uppercase tracking-wide flex items-center gap-1.5 ${user?.isApproved ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                <span className="material-symbols-outlined text-[16px]">{user?.isApproved ? 'check_circle' : 'pending'}</span>
                {user?.isApproved ? 'Verified Vendor' : 'Pending Verification'}
              </span>
              <span className="text-sm text-muted-text flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">store</span>
                Vendor Partner
              </span>
            </div>
          </div>
        </div>
        {!desktopEditing && (
          <button onClick={() => setDesktopEditing(true)} className="px-5 py-2.5 bg-surface-variant hover:bg-surface-variant-hover text-on-surface font-semibold rounded-xl flex items-center gap-2 transition-colors border border-border shadow-sm">
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Summary Card */}
        <div className="col-span-4 space-y-6">
          <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm text-center">
            <div className="w-16 h-16 mx-auto bg-soft-primary rounded-full flex items-center justify-center text-primary text-2xl font-bold overflow-hidden mb-4">
              {user?.avatar ? (
                <img src={user.avatar.startsWith('data:') ? user.avatar : getImageUrl(user.avatar)} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <h3 className="font-bold text-on-surface text-lg">{user?.name}</h3>
            <p className="text-sm text-muted-text mt-1">{user?.email}</p>
            <div className="mt-6 pt-6 border-t border-border/60">
              <div className="flex items-center gap-3 text-sm text-on-surface p-3 bg-background-alt rounded-xl border border-border/60 text-left">
                <span className="material-symbols-outlined text-primary text-xl">shield_person</span>
                <div>
                  <p className="font-semibold">Security</p>
                  <p className="text-xs text-muted-text">Managed via settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details or Edit Form */}
        <div className="col-span-8">
          <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-border bg-background-alt/30">
              <h3 className="font-semibold text-on-surface text-lg">Personal & Business Information</h3>
            </div>
            
            {desktopEditing ? (
              <div className="p-8 space-y-8">
                
                <div className="flex items-center gap-6 pb-8 border-b border-border">
                  <div className="flex-shrink-0">
                    <h4 className="text-sm font-medium text-on-surface mb-3">Profile Avatar</h4>
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
                  <div className="text-sm text-muted-text">
                    <p className="font-medium text-on-surface mb-1">Upload a professional image</p>
                    <p>Supported formats: JPG, PNG, WebP.</p>
                    <p>Maximum file size: 1MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Full Name <span className="text-error">*</span></label>
                    <input type="text" name="name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Email Address</label>
                    <input type="email" value={user?.email || ''} readOnly disabled className="w-full bg-surface-variant/50 border border-border text-muted-text rounded-xl py-2.5 px-4 text-sm outline-none cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Phone Number</label>
                    <input type="tel" name="phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-on-surface">Business Name</label>
                    <input type="text" name="businessName" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} className="w-full bg-background-alt border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-border flex items-center justify-end gap-3">
                  <button type="button" onClick={handleCancelDesktop} disabled={saving} className="px-5 py-2.5 text-on-surface hover:bg-surface-variant font-medium rounded-xl transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm">
                    {saving ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>Saving...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[18px]">save</span>Save Changes</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8">
                <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Full Name</p>
                    <p className="text-[15px] text-on-surface font-medium">{user?.name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Email Address</p>
                    <p className="text-[15px] text-on-surface font-medium">{user?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Phone Number</p>
                    <p className="text-[15px] text-on-surface font-medium">{user?.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-text uppercase tracking-wider mb-1">Business Name</p>
                    <p className="text-[15px] text-on-surface font-medium">{user?.businessName || '—'}</p>
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
