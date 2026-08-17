import { useState, useRef } from 'react';
import { useSettings } from '../../../context/SettingContext';
import { updateAppLogo } from '../../../services/api/settingApi';

export default function SettingsPage() {
  const { settings, fetchSettings } = useSettings();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveLogo = async () => {
    if (!logoFile) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('logo', logoFile);
      
      const res = await updateAppLogo(formData);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'App logo updated successfully' });
        await fetchSettings();
        setLogoFile(null);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update app logo' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Platform Settings</h1>
          <p className="text-muted-text mt-1">Manage global application settings</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Branding</h2>
        
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Application Logo</h3>
            <p className="text-xs text-muted-text max-w-md">
              This logo will be displayed on the admin panel, vendor panel, user app, and as the website favicon.
              Recommended size: 512x512px.
            </p>
            
            <div className="pt-4 flex gap-3">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-sm font-medium hover:bg-border transition-colors"
              >
                Choose Image
              </button>
              {logoFile && (
                <button 
                  onClick={handleSaveLogo}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Logo'}
                </button>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
          
          <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-border bg-background-alt flex items-center justify-center shrink-0 overflow-hidden">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
            ) : settings?.appLogo ? (
              <img src={`${import.meta.env.VITE_API_URL.replace(/\/api$/, '')}/uploads/${settings.appLogo}`} alt="Current Logo" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="material-symbols-outlined text-4xl text-muted-text opacity-50">image</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
