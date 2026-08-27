import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { loginVendor } from '../services/vendorApi';
import { useSettings } from '../../../context/SettingContext';
import { getImageUrl } from '../../../utils/imageUtils';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAuth } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await loginVendor(formData);
      setAuth('vendor', res.data.data.vendor, res.data.data.token);
      navigate('/vendor'); }
    catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {settings?.appLogo ? (
            <div className="inline-flex items-center justify-center mb-4">
              <img src={getImageUrl(settings.appLogo)} alt="App Logo" className="w-16 h-16 rounded-2xl object-contain" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg mb-4">
              <span className="material-symbols-outlined text-[36px] text-white">spa</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-on-surface">{settings?.appName || 'Glentro Salon'}</h1>
          <p className="text-muted-text text-sm mt-1">Vendor Management Portal</p>
        </div>
        <div className="bg-surface rounded-2xl shadow-xl p-8 border border-border">
          <h2 className="text-xl font-bold text-on-surface mb-6">Sign In</h2>
          {error && <div className="mb-4 px-4 py-3 rounded-xl bg-error/10 text-error text-sm border border-error/20">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-text mb-1.5">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required
                className="w-full px-4 py-3 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm" placeholder="vendor@email.com" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="text-[13px] font-medium text-muted-text">Password</label>
                <Link to="/forgot-password" state={{ returnUrl: '/vendor/login' }} className="text-[13px] font-medium text-primary hover:text-primary-dark transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required
                  className="w-full px-4 py-3 pr-12 bg-surface text-on-surface rounded-xl border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm" placeholder="Enter password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-text hover:text-primary transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">login</span>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-text">
            New vendor? <Link to="/vendor/register" className="text-primary font-semibold hover:text-primary-dark">Register Business</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
