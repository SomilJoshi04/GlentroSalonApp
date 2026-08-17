import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../../context/SettingContext';
import { updateAppLogo, updateAppName } from '../../../services/api/settingApi';

export default function SettingsPage() {
  const { settings, fetchSettings } = useSettings();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Initialize app name from settings
  useEffect(() => {
    if (settings?.appName) {
      setAppName(settings.appName);
    }
  }, [settings]);

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

  const handleSaveAppName = async () => {
    if (!appName.trim()) return;
    setNameLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await updateAppName(appName.trim());
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'App name updated successfully' });
        await fetchSettings();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update app name' });
    } finally {
      setNameLoading(false);
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

        <hr className="my-8 border-border" />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Application Name</h3>
            <p className="text-xs text-muted-text max-w-md">
              This name will be displayed next to the logo on the admin panel, vendor panel, user app, and as the website title.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Enter App Name (e.g. SalonBook)"
                className="flex-1 px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
              />
              <button 
                onClick={handleSaveAppName}
                disabled={nameLoading || !appName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {nameLoading ? 'Saving...' : 'Save Name'}
              </button>
            </div>
          </div>
          
          <div className="w-32 hidden sm:block shrink-0"></div>
        </div>
      </div>
    </div>
  );
}
