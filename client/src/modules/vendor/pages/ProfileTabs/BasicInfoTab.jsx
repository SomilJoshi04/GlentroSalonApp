import { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { updateProfile } from '../../services/vendorApi';
import ImageUpload from '../../../../components/common/ImageUpload';
import toast from 'react-hot-toast';

const BasicInfoTab = ({ onProfileUpdate }) => {
  const { vendor } = useAuth();
  
  const [form, setForm] = useState({
    name: vendor?.name || '',
    phone: vendor?.phone || '',
    businessName: vendor?.businessName || '',
    businessType: vendor?.businessType || '',
    businessDescription: vendor?.businessDescription || '',
    businessEmail: vendor?.businessEmail || '',
    businessContact: vendor?.businessContact || '',
    registeredAddress: vendor?.registeredAddress || '',
    city: vendor?.city || '',
    state: vendor?.state || '',
    country: vendor?.country || 'India',
    avatarRemoved: false
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      Object.keys(form).forEach(key => {
        if (key !== 'avatarRemoved') {
          data.append(key, form[key]);
        }
      });
      
      if (avatarFile) {
        data.append('avatar', avatarFile);
      } else if (avatarFile === null && form.avatarRemoved) {
        data.append('avatar', '');
      }

      const r = await updateProfile(data);
      onProfileUpdate(r.data.data);
      toast.success('Basic details updated successfully.');
      setAvatarFile(null);
      setForm(prev => ({ ...prev, avatarRemoved: false }));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to update details.');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pb-6 border-b border-border">
        <div className="flex-shrink-0">
          <h4 className="text-sm font-medium text-on-surface mb-3">Profile Avatar</h4>
          <ImageUpload 
            currentImage={vendor?.avatar} 
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Full Name <span className="text-error">*</span></label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Primary Phone <span className="text-error">*</span></label>
          <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Email Address</label>
          <input type="email" value={vendor?.email || ''} disabled className="w-full bg-surface-variant/50 border border-border text-muted-text rounded-xl py-2.5 px-4 text-sm outline-none cursor-not-allowed" />
          <p className="text-xs text-muted-text">Login email cannot be changed here.</p>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Business Name <span className="text-error">*</span></label>
          <input type="text" value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} required className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Business Type</label>
          <select value={form.businessType} onChange={e => setForm({...form, businessType: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all">
            <option value="">Select Type</option>
            <option value="individual">Individual / Freelancer</option>
            <option value="partnership">Partnership</option>
            <option value="pvt_ltd">Private Limited</option>
            <option value="llp">LLP</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-on-surface">Business Description</label>
          <textarea value={form.businessDescription} onChange={e => setForm({...form, businessDescription: e.target.value})} rows="3" className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all resize-none"></textarea>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Business Email</label>
          <input type="email" value={form.businessEmail} onChange={e => setForm({...form, businessEmail: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">Business Contact</label>
          <input type="tel" value={form.businessContact} onChange={e => setForm({...form, businessContact: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="block text-sm font-medium text-on-surface">Registered Address</label>
          <input type="text" value={form.registeredAddress} onChange={e => setForm({...form, registeredAddress: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">City</label>
          <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-on-surface">State</label>
          <input type="text" value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full bg-surface border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 px-4 text-sm outline-none transition-all" />
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-medium rounded-xl transition-all disabled:opacity-70 flex items-center gap-2 shadow-sm">
          {saving ? 'Saving...' : 'Save Details'}
        </button>
      </div>
    </form>
  );
};

export default BasicInfoTab;
