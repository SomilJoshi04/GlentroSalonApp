import { useState, useRef, useEffect } from 'react';
import { useSettings } from '../../../context/SettingContext';
import { updateAppLogo, updateAppName, updateSearchRadius, updateBulkSettings, updateLoginImage, updateRegisterImage } from '../../../services/api/settingApi';
import ImageUpload from '../../../components/common/ImageUpload';

export default function SettingsPage() {
  const { settings, fetchSettings } = useSettings();
  const [logoFile, setLogoFile] = useState(null);
  const [loginImageFile, setLoginImageFile] = useState(null);
  const [registerImageFile, setRegisterImageFile] = useState(null);
  const [loginImageLoading, setLoginImageLoading] = useState(false);
  const [registerImageLoading, setRegisterImageLoading] = useState(false);
  const [appName, setAppName] = useState('');
  const [searchRadius, setSearchRadius] = useState('');
  const [maxPendingDuesLimit, setMaxPendingDuesLimit] = useState('500'); // default display 500
  const [jacuzziEnabled, setJacuzziEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nameLoading, setNameLoading] = useState(false);
  const [radiusLoading, setRadiusLoading] = useState(false);
  const [duesLimitLoading, setDuesLimitLoading] = useState(false);
  const [jacuzziLoading, setJacuzziLoading] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportSettings, setSupportSettings] = useState({
    supportEmail: '',
    supportPhone: '',
    supportWhatsApp: '',
    supportHours: '',
    supportDescription: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Initialize app name from settings
  useEffect(() => {
    if (settings?.appName) setAppName(settings.appName);
    if (settings?.salonSearchRadius) setSearchRadius(settings.salonSearchRadius);
    if (settings?.maxPendingDuesLimit) {
      // convert from paise to rupees for display
      setMaxPendingDuesLimit((parseInt(settings.maxPendingDuesLimit, 10) / 100).toString());
    }
    if (settings?.jacuzziGlobalEnabled !== undefined) setJacuzziEnabled(settings.jacuzziGlobalEnabled === 'true' || settings.jacuzziGlobalEnabled === true);
    if (settings) {
      setSupportSettings({
        supportEmail: settings.supportEmail || '',
        supportPhone: settings.supportPhone || '',
        supportWhatsApp: settings.supportWhatsApp || '',
        supportHours: settings.supportHours || '',
        supportDescription: settings.supportDescription || '',
      });
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

  const handleSaveLoginImage = async () => {
    if (!loginImageFile) return;
    setLoginImageLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('image', loginImageFile);
      
      const res = await updateLoginImage(formData);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Login page image updated successfully' });
        await fetchSettings();
        setLoginImageFile(null);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update login page image' });
    } finally {
      setLoginImageLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSaveRegisterImage = async () => {
    if (!registerImageFile) return;
    setRegisterImageLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const formData = new FormData();
      formData.append('image', registerImageFile);
      
      const res = await updateRegisterImage(formData);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Register page image updated successfully' });
        await fetchSettings();
        setRegisterImageFile(null);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update register page image' });
    } finally {
      setRegisterImageLoading(false);
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

  const handleSaveSearchRadius = async () => {
    if (!searchRadius || isNaN(searchRadius) || Number(searchRadius) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid radius greater than 0' });
      return;
    }
    setRadiusLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await updateSearchRadius(searchRadius);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Salon search radius updated successfully' });
        await fetchSettings();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update search radius' });
    } finally {
      setRadiusLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSaveDuesLimit = async () => {
    if (!maxPendingDuesLimit || isNaN(maxPendingDuesLimit) || Number(maxPendingDuesLimit) < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }
    setDuesLimitLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // convert rupees to paise for backend
      const amountPaise = Math.round(Number(maxPendingDuesLimit) * 100);
      const res = await updateBulkSettings({ maxPendingDuesLimit: amountPaise.toString() });
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Max Pending Dues Limit updated successfully' });
        await fetchSettings();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update dues limit' });
    } finally {
      setDuesLimitLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleToggleJacuzzi = async (e) => {
    const newValue = e.target.checked;
    setJacuzziEnabled(newValue);
    setJacuzziLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await updateBulkSettings({ jacuzziGlobalEnabled: newValue.toString() });
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Global Jacuzzi feature updated' });
        await fetchSettings();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update Jacuzzi setting' });
      setJacuzziEnabled(!newValue); // revert on failure
    } finally {
      setJacuzziLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const handleSaveSupportSettings = async () => {
    setSupportLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await updateBulkSettings(supportSettings);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Support configuration updated successfully' });
        await fetchSettings();
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update support configuration' });
    } finally {
      setSupportLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  if (pageLoading) {
    return (
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 bg-surface-variant rounded-lg w-64 mb-2"></div>
            <div className="h-4 bg-surface-variant rounded-lg w-48"></div>
          </div>
        </div>
        
        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
          <div className="h-6 bg-surface-variant rounded-lg w-32 mb-6"></div>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="flex-1 space-y-4 w-full">
              <div className="h-5 bg-surface-variant rounded-lg w-40"></div>
              <div className="h-16 bg-surface-variant rounded-lg w-full max-w-md"></div>
              <div className="h-32 bg-surface-variant rounded-2xl w-full"></div>
            </div>
            <div className="flex-1 space-y-4 w-full sm:border-l sm:border-border sm:pl-6">
              <div className="h-5 bg-surface-variant rounded-lg w-40"></div>
              <div className="h-10 bg-surface-variant rounded-xl w-full max-w-md"></div>
              <div className="h-10 bg-surface-variant rounded-xl w-32"></div>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
           <div className="h-6 bg-surface-variant rounded-lg w-48 mb-6"></div>
           <div className="space-y-4 max-w-md">
             <div className="h-5 bg-surface-variant rounded-lg w-40"></div>
             <div className="h-12 bg-surface-variant rounded-xl w-full"></div>
             <div className="h-10 bg-surface-variant rounded-xl w-32"></div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl h-full overflow-y-auto pb-20 pr-4">
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
            
            <div className="pt-4 flex gap-3 flex-col sm:flex-row">
              <div className="flex-1">
                <ImageUpload 
                  currentImage={settings?.appLogo}
                  onFileSelect={setLogoFile}
                  label=""
                  maxSizeMB={0.5}
                />
              </div>
              {logoFile && (
                <button 
                  onClick={handleSaveLogo}
                  disabled={loading}
                  className="px-4 py-2 mt-4 sm:mt-0 h-fit bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Logo'}
                </button>
              )}
            </div>
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

        <hr className="my-8 border-border" />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Login Page Image</h3>
            <p className="text-xs text-muted-text max-w-md">
              This image will be displayed on the public Login page.
              Recommended size: High resolution portrait image (e.g. 1200x1600px).
            </p>
            
            <div className="pt-4 flex gap-3 flex-col sm:flex-row">
              <div className="flex-1">
                <ImageUpload 
                  currentImage={settings?.loginPageImage}
                  onFileSelect={setLoginImageFile}
                  label=""
                  maxSizeMB={2}
                />
              </div>
              {loginImageFile && (
                <button 
                  onClick={handleSaveLoginImage}
                  disabled={loginImageLoading}
                  className="px-4 py-2 mt-4 sm:mt-0 h-fit bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loginImageLoading ? 'Saving...' : 'Save Image'}
                </button>
              )}
            </div>
          </div>
        </div>

        <hr className="my-8 border-border" />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Register Page Image</h3>
            <p className="text-xs text-muted-text max-w-md">
              This image will be displayed on the public Register page.
              Recommended size: High resolution portrait image (e.g. 1200x1600px).
            </p>
            
            <div className="pt-4 flex gap-3 flex-col sm:flex-row">
              <div className="flex-1">
                <ImageUpload 
                  currentImage={settings?.registerPageImage}
                  onFileSelect={setRegisterImageFile}
                  label=""
                  maxSizeMB={2}
                />
              </div>
              {registerImageFile && (
                <button 
                  onClick={handleSaveRegisterImage}
                  disabled={registerImageLoading}
                  className="px-4 py-2 mt-4 sm:mt-0 h-fit bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {registerImageLoading ? 'Saving...' : 'Save Image'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Discovery Configurations</h2>
        
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Salon Search Radius</h3>
            <p className="text-xs text-muted-text max-w-md">
              Controls how far the system searches for nearby salons from the user's location.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 flex-1">
                <input 
                  type="number" 
                  min="1"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full sm:max-w-[150px] px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
                />
                <span className="font-label-md text-muted-text">KM</span>
              </div>
              <button 
                onClick={handleSaveSearchRadius}
                disabled={radiusLoading || !searchRadius}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {radiusLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          
          <div className="w-32 hidden sm:block shrink-0"></div>
        </div>

        <hr className="my-8 border-border" />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Global Jacuzzi Feature</h3>
            <p className="text-xs text-muted-text max-w-md">
              Enable or disable Jacuzzi services platform-wide. If disabled, Jacuzzi services will not be bookable by users, regardless of vendor settings.
            </p>
            
            <div className="pt-4 flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={jacuzziEnabled} onChange={handleToggleJacuzzi} disabled={jacuzziLoading} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
              {jacuzziLoading && <span className="text-xs text-muted-text">Saving...</span>}
            </div>
          </div>
          <div className="w-32 hidden sm:block shrink-0"></div>
        </div>

        <hr className="my-8 border-border" />

        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 space-y-2">
            <h3 className="text-sm font-medium text-on-surface">Max Vendor Pending Dues (₹)</h3>
            <p className="text-xs text-muted-text max-w-md">
              If a vendor's recovery dues (unpaid commission from auto-settled cash bookings) exceeds this amount, their account will be automatically suspended.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex items-center gap-2 flex-1">
                <span className="font-label-md text-muted-text">₹</span>
                <input 
                  type="number" 
                  min="0"
                  value={maxPendingDuesLimit}
                  onChange={(e) => setMaxPendingDuesLimit(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full sm:max-w-[150px] px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
                />
              </div>
              <button 
                onClick={handleSaveDuesLimit}
                disabled={duesLimitLoading || !maxPendingDuesLimit}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {duesLimitLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
          <div className="w-32 hidden sm:block shrink-0"></div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Support Configuration</h2>
        
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-on-surface">Support Email</label>
              <input 
                type="email" 
                value={supportSettings.supportEmail}
                onChange={(e) => setSupportSettings({ ...supportSettings, supportEmail: e.target.value })}
                placeholder="e.g. support@glentrosalon.com"
                className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-on-surface">Support Phone</label>
              <input 
                type="text" 
                value={supportSettings.supportPhone}
                onChange={(e) => setSupportSettings({ ...supportSettings, supportPhone: e.target.value })}
                placeholder="e.g. +1 800 123 4567"
                className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-on-surface">WhatsApp Number</label>
              <input 
                type="text" 
                value={supportSettings.supportWhatsApp}
                onChange={(e) => setSupportSettings({ ...supportSettings, supportWhatsApp: e.target.value })}
                placeholder="e.g. +1 800 123 4567"
                className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-on-surface">Support Hours</label>
              <input 
                type="text" 
                value={supportSettings.supportHours}
                onChange={(e) => setSupportSettings({ ...supportSettings, supportHours: e.target.value })}
                placeholder="e.g. Mon-Fri, 9am - 6pm"
                className="w-full px-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Support Description Paragraph</label>
            <p className="text-xs text-muted-text mb-2">This is the main introduction text displayed on the Help & Support page.</p>
            <textarea 
              value={supportSettings.supportDescription}
              onChange={(e) => setSupportSettings({ ...supportSettings, supportDescription: e.target.value })}
              placeholder="Our support team is here to help..."
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-background-alt resize-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button 
              onClick={handleSaveSupportSettings}
              disabled={supportLoading}
              className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {supportLoading ? 'Saving...' : 'Save Support Config'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
